import * as vscode from 'vscode';
import { ProjectTreeProvider } from './tree/projectTreeProvider';
import { SyncService } from './services/syncService';
import { ConfigService } from './services/configService';
import { LicenseService } from './services/licenseService';

let treeProvider: ProjectTreeProvider | undefined;
let syncService: SyncService | undefined;
let licenseService: LicenseService | undefined;

export async function activate(context: vscode.ExtensionContext) {
  const configService = new ConfigService(context);
  licenseService = new LicenseService(context);
  treeProvider = new ProjectTreeProvider(configService);
  syncService = new SyncService(context, configService, treeProvider, licenseService);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('todo-sync-projects', treeProvider),

    vscode.commands.registerCommand('todo-sync.setApiKey', async () => {
      const token = await vscode.window.showInputBox({
        prompt: 'Enter Notion API key (secret_xxx)',
        password: true,
        ignoreFocusOut: true,
      });
      if (token) {
        await configService.storeApiKey(token);
        vscode.window.showInformationMessage('ToDoSync: Notion API key saved.');
        await syncService?.syncCurrentWorkspace();
      }
    }),

    vscode.commands.registerCommand('todo-sync.linkProject', async () => {
      await syncService?.linkCurrentWorkspaceToDatabase();
    }),

    vscode.commands.registerCommand('todo-sync.syncNow', async () => {
      await syncService?.syncCurrentWorkspace();
    }),

    vscode.commands.registerCommand('todo-sync.syncAll', async () => {
      await syncService?.syncAllWorkspaces();
    }),

    vscode.commands.registerCommand('todo-sync.toggleStatus', async (item) => {
      await syncService?.toggleStatus(item);
    }),

    vscode.commands.registerCommand('todo-sync.addTask', async () => {
      await syncService?.addTask();
    }),

    vscode.commands.registerCommand('todo-sync.importTasks', async () => {
      await syncService?.importTasks();
    }),

    vscode.commands.registerCommand('todo-sync.viewProjects', async () => {
      const projects = configService.getTrackedProjects();
      if (projects.length === 0) {
        vscode.window.showInformationMessage('No projects linked yet. Use "ToDoSync: Link Project" to get started.');
        return;
      }
      
      const items = projects.map(p => ({
        label: `📁 ${p.projectName}`,
        detail: `Database: ${p.notionDatabaseId}`,
        description: p.path,
        project: p
      }));
      
      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `${projects.length} tracked project${projects.length > 1 ? 's' : ''}`,
        title: 'ToDoSync: Tracked Projects'
      });
      
      if (selected) {
        const action = await vscode.window.showQuickPick(
          ['Open in Notion', 'Unlink Project', 'Cancel'],
          { placeHolder: `Manage ${selected.project.projectName}` }
        );
        
        if (action === 'Open in Notion') {
          vscode.env.openExternal(vscode.Uri.parse(`https://notion.so/${selected.project.notionDatabaseId}`));
        } else if (action === 'Unlink Project') {
          await configService.removeProjectByPath(selected.project.path);
          vscode.window.showInformationMessage(`Unlinked ${selected.project.projectName}`);
        }
      }
    }),

    vscode.commands.registerCommand('todo-sync.unlinkProject', async () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
      }
      
      const tracked = configService.getTrackedProjects().find(p => p.path === folder.uri.fsPath);
      if (!tracked) {
        vscode.window.showInformationMessage('This workspace is not linked to any Notion database.');
        return;
      }
      
      const confirm = await vscode.window.showWarningMessage(
        `Unlink "${tracked.projectName}" from this workspace?`,
        'Unlink',
        'Cancel'
      );
      
      if (confirm === 'Unlink') {
        await configService.removeProjectByPath(folder.uri.fsPath);
        vscode.window.showInformationMessage(`Unlinked ${tracked.projectName}`);
        treeProvider?.setItems([]);
      }
    })
  );

  // initial auto-refresh setup
  syncService.startAutoRefresh();
}

export function deactivate() {
  syncService?.dispose();
}


