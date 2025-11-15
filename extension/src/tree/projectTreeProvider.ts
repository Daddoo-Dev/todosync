import * as vscode from 'vscode';
import { TrackedProject } from '../services/configService';
import { NotionClientWrapper } from '../notion/notionClient';

export type TaskItem = {
  id: string;
  title: string;
  status: 'Not started' | 'In progress' | 'Done' | string;
  category?: string;
  project: TrackedProject;
};

export type EmptyStateEntry = {
  label: string;
  description?: string;
  icon?: string;
  command?: string;
  commandArgs?: any[];
  tooltip?: string;
};

export type InfoTreeItem = EmptyStateEntry & {
  type: 'info';
};

type CategoryTreeItem = {
  type: 'category';
  label: string;
  children: TaskItem[];
};

type TaskTreeItemNode = {
  type: 'task';
  label: string;
  task: TaskItem;
};

export type TreeItem = InfoTreeItem | CategoryTreeItem | TaskTreeItemNode;

export class ProjectTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private items: TaskItem[] = [];
  private emptyStateItems: InfoTreeItem[] | undefined;
  private quickActionItems: InfoTreeItem[] = [];
  private notionClient: NotionClientWrapper | undefined;
  private treeView: vscode.TreeView<TreeItem> | undefined;

  constructor() {}

  setTreeView(treeView: vscode.TreeView<TreeItem>) {
    this.treeView = treeView;
    this.updateDescription();
  }

  setNotionClient(client: NotionClientWrapper) {
    this.notionClient = client;
  }

  setItems(items: TaskItem[], options?: { suppressEmptyState?: boolean }) {
    this.items = items.slice();
    if (this.items.length > 0) {
      this.clearEmptyState();
    } else if (!options?.suppressEmptyState && !this.emptyStateItems) {
      this.showEmptyState([
        {
          label: '⚪ No tasks yet',
          description: 'Use Add task or import from markdown'
        }
      ]);
    }
    this._onDidChangeTreeData.fire();
    this.updateDescription();
  }

  getCurrentTasks(): TaskItem[] {
    return this.items.slice();
  }

  showEmptyState(items: EmptyStateEntry[]) {
    this.clearQuickActions();
    this.emptyStateItems = items.map(item => ({
      type: 'info',
      ...item
    }));
    this._onDidChangeTreeData.fire();
  }

  clearEmptyState() {
    if (this.emptyStateItems) {
      this.emptyStateItems = undefined;
      this._onDidChangeTreeData.fire();
    }
  }

  showQuickActions(items: EmptyStateEntry[]) {
    this.quickActionItems = items.map(item => ({
      type: 'info',
      ...item
    }));
    this._onDidChangeTreeData.fire();
  }

  clearQuickActions() {
    if (this.quickActionItems.length > 0) {
      this.quickActionItems = [];
      this._onDidChangeTreeData.fire();
    }
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
    }

    if (element.type === 'task') {
      const task = element.task;
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

    const info = element;
    const infoItem = new vscode.TreeItem(info.label, vscode.TreeItemCollapsibleState.None);
    infoItem.contextValue = 'infoItem';
    if (info.description) {
      infoItem.description = info.description;
    }
    if (info.tooltip) {
      infoItem.tooltip = new vscode.MarkdownString(info.tooltip);
    }
    if (info.icon) {
      infoItem.iconPath = new vscode.ThemeIcon(info.icon);
    }
    if (info.command) {
      infoItem.command = {
        command: info.command,
        title: info.label,
        arguments: info.commandArgs
      };
    }
    return infoItem;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!element) {
      if (this.emptyStateItems && this.emptyStateItems.length > 0) {
        return Promise.resolve(this.emptyStateItems);
      }

      const hideCompleted = vscode.workspace.getConfiguration().get<boolean>('todoSync.hideCompletedTasks', false);
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

      if (this.quickActionItems.length > 0) {
        result.push(...this.quickActionItems);
      }

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

      const sortedUncategorized = this.sortTasks(uncategorized);
      for (const task of sortedUncategorized) {
        result.push({
          type: 'task',
          label: task.title,
          task
        });
      }

      return Promise.resolve(result);
    }

    if (element.type === 'category') {
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
