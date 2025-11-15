import * as vscode from 'vscode';
import { ConfigService, TrackedProject } from '../services/configService';
import { NotionClientWrapper } from '../notion/notionClient';

export type TaskItem = {
  id: string;
  title: string;
  status: 'Not started' | 'In progress' | 'Done' | string;
  category?: string;
  project: TrackedProject;
};

export type TreeItem = {
  type: 'category' | 'task';
  label: string;
  children?: TaskItem[];
  task?: TaskItem;
};

export class ProjectTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private items: TaskItem[] = [];
  private notionClient: NotionClientWrapper | undefined;
  private treeView: vscode.TreeView<TreeItem> | undefined;

  constructor(private readonly configService: ConfigService) {}

  setTreeView(treeView: vscode.TreeView<TreeItem>) {
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

  getCurrentTasks(): TaskItem[] {
    return this.items.slice();
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

  getTreeItem(element: TreeItem): vscode.TreeItem {
    if (element.type === 'category') {
      // Category parent item
      const tasks = element.children || [];
      const completed = tasks.filter(t => t.status === 'Done').length;
      const total = tasks.length;
      
      const item = new vscode.TreeItem(
        element.label,
        vscode.TreeItemCollapsibleState.Expanded
      );
      item.description = `${completed}/${total}`;
      item.contextValue = 'categoryItem';
      return item;
    } else {
      // Task item
      const task = element.task!;
      const emoji = this.notionClient?.getStatusEmoji(task.status, task.project.statusOptions) || '⚪';
      const item = new vscode.TreeItem(`${emoji} ${task.title}`, vscode.TreeItemCollapsibleState.None);
      item.description = task.status;
      item.contextValue = 'taskItem';
      item.command = {
        command: 'todo-sync.toggleStatus',
        title: 'Change Status',
        arguments: [task]
      };
      return item;
    }
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!element) {
      // Root level - return categories
      const hideCompleted = vscode.workspace.getConfiguration().get<boolean>('todoSync.hideCompletedTasks', false);
      
      // Filter out completed tasks if setting is enabled
      const visibleItems = hideCompleted 
        ? this.items.filter(item => item.status !== 'Done')
        : this.items;
      
      const categorized = new Map<string, TaskItem[]>();
      const uncategorized: TaskItem[] = [];
      
      for (const item of visibleItems) {
        if (item.category) {
          if (!categorized.has(item.category)) {
            categorized.set(item.category, []);
          }
          categorized.get(item.category)!.push(item);
        } else {
          uncategorized.push(item);
        }
      }
      
      const result: TreeItem[] = [];
      
      // Add categorized items (skip empty categories)
      for (const [category, tasks] of categorized.entries()) {
        if (tasks.length > 0) {
          const sorted = this.sortTasks(tasks);
          result.push({
            type: 'category',
            label: category,
            children: sorted
          });
        }
      }
      
      // Add uncategorized items directly at root
      const sortedUncategorized = this.sortTasks(uncategorized);
      for (const task of sortedUncategorized) {
        result.push({
          type: 'task',
          label: task.title,
          task
        });
      }
      
      return Promise.resolve(result);
    } else if (element.type === 'category') {
      // Return children of category
      return Promise.resolve(element.children!.map(task => ({
        type: 'task' as const,
        label: task.title,
        task
      })));
    }
    
    return Promise.resolve([]);
  }

  private sortTasks(tasks: TaskItem[]): TaskItem[] {
    return tasks.slice().sort((a, b) => {
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
  }
}
