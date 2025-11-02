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
    })
  );

  // initial auto-refresh setup
  syncService.startAutoRefresh();
}

export function deactivate() {
  syncService?.dispose();
}


