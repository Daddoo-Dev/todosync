"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const projectTreeProvider_1 = require("./tree/projectTreeProvider");
const syncService_1 = require("./services/syncService");
const configService_1 = require("./services/configService");
const licenseService_1 = require("./services/licenseService");
let treeProvider;
let syncService;
let licenseService;
async function activate(context) {
    const configService = new configService_1.ConfigService(context);
    licenseService = new licenseService_1.LicenseService(context);
    treeProvider = new projectTreeProvider_1.ProjectTreeProvider(configService);
    syncService = new syncService_1.SyncService(context, configService, treeProvider, licenseService);
    context.subscriptions.push(vscode.window.registerTreeDataProvider('todo-sync-projects', treeProvider), vscode.commands.registerCommand('todo-sync.setApiKey', async () => {
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
    }), vscode.commands.registerCommand('todo-sync.linkProject', async () => {
        await syncService?.linkCurrentWorkspaceToDatabase();
    }), vscode.commands.registerCommand('todo-sync.syncNow', async () => {
        await syncService?.syncCurrentWorkspace();
    }), vscode.commands.registerCommand('todo-sync.syncAll', async () => {
        await syncService?.syncAllWorkspaces();
    }), vscode.commands.registerCommand('todo-sync.toggleStatus', async (item) => {
        await syncService?.toggleStatus(item);
    }), vscode.commands.registerCommand('todo-sync.addTask', async () => {
        await syncService?.addTask();
    }), vscode.commands.registerCommand('todo-sync.viewProjects', async () => {
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
            const action = await vscode.window.showQuickPick(['Open in Notion', 'Unlink Project', 'Cancel'], { placeHolder: `Manage ${selected.project.projectName}` });
            if (action === 'Open in Notion') {
                vscode.env.openExternal(vscode.Uri.parse(`https://notion.so/${selected.project.notionDatabaseId}`));
            }
            else if (action === 'Unlink Project') {
                await configService.removeProjectByPath(selected.project.path);
                vscode.window.showInformationMessage(`Unlinked ${selected.project.projectName}`);
            }
        }
    }), vscode.commands.registerCommand('todo-sync.unlinkProject', async () => {
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
        const confirm = await vscode.window.showWarningMessage(`Unlink "${tracked.projectName}" from this workspace?`, 'Unlink', 'Cancel');
        if (confirm === 'Unlink') {
            await configService.removeProjectByPath(folder.uri.fsPath);
            vscode.window.showInformationMessage(`Unlinked ${tracked.projectName}`);
            treeProvider?.setItems([]);
        }
    }));
    // initial auto-refresh setup
    syncService.startAutoRefresh();
}
function deactivate() {
    syncService?.dispose();
}
//# sourceMappingURL=extension.js.map
// St Joseph, pray for us
// St Michael, pray for us
// St Carlo, Pray for us
// Bl Michael McGivney, Pray for us