import * as vscode from 'vscode';
import { ConfigService, TrackedProject } from '../services/configService';
import { NotionClientWrapper } from '../notion/notionClient';

export type TaskItem = {
  id: string;
  title: string;
  status: 'Not started' | 'In progress' | 'Done' | string;
  project: TrackedProject;
};

export class ProjectTreeProvider implements vscode.TreeDataProvider<TaskItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private items: TaskItem[] = [];
  private notionClient: NotionClientWrapper | undefined;
  private treeView: vscode.TreeView<TaskItem> | undefined;

  constructor(private readonly configService: ConfigService) {}

  setTreeView(treeView: vscode.TreeView<TaskItem>) {
    this.treeView = treeView;
    this.updateDescription();
  }

  setNotionClient(client: NotionClientWrapper) {
    this.notionClient = client;
  }

  setItems(items: TaskItem[]) {
    this.items = items.slice();
    this._onDidChangeTreeData.fire();
    this.updateDescription();
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  private updateDescription() {
    if (this.treeView) {
      const total = this.items.length;
      const completed = this.items.filter(item => item.status === 'Done').length;
      
      if (total > 0) {
        this.treeView.description = `${completed}/${total} task${total !== 1 ? 's' : ''}`;
      } else {
        this.treeView.description = '';
      }
    }
  }

  getTreeItem(element: TaskItem): vscode.TreeItem {
    const emoji = this.notionClient?.getStatusEmoji(element.status, element.project.statusOptions) || '⚪';
    const item = new vscode.TreeItem(`${emoji} ${element.title}`, vscode.TreeItemCollapsibleState.None);
    item.description = element.status;
    item.contextValue = 'taskItem';
    item.command = {
      command: 'todo-sync.toggleStatus',
      title: 'Change Status',
      arguments: [element]
    };
    return item;
  }

  getChildren(): Thenable<TaskItem[]> {
    const sorted = this.items.slice().sort((a, b) => {
      const project = a.project;
      const statusOptions = project.statusOptions || [];
      const order: Record<string, number> = {};
      statusOptions.forEach((opt, idx) => {
        order[opt.name] = idx;
      });
      const o = (order[a.status] ?? 99) - (order[b.status] ?? 99);
      if (o !== 0) return o;
      return a.title.localeCompare(b.title);
    });
    return Promise.resolve(sorted);
  }
}
