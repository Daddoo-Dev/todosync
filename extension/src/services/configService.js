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
exports.ConfigService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SECRET_KEY = 'todoSync.notionApiKey';
class ConfigService {
    constructor(context) {
        this.context = context;
    }
    get enableDebug() {
        return vscode.workspace.getConfiguration().get('todoSync.enableDebug', false);
    }
    async storeApiKey(key) {
        await this.context.secrets.store(SECRET_KEY, key);
    }
    async getApiKey() {
        // First check .env file in workspace root
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const envPath = path.join(workspaceFolder.uri.fsPath, '.env');
            try {
                if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const envLines = envContent.split('\n');
                    for (const line of envLines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('NOTION_API_KEY=')) {
                            const key = trimmed.substring('NOTION_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
                            if (key)
                                return key;
                        }
                    }
                }
            }
            catch (error) {
                // If .env read fails, fall through to SecretStorage
            }
        }
        // Fall back to SecretStorage
        return await this.context.secrets.get(SECRET_KEY);
    }
    getTrackedProjects() {
        return vscode.workspace.getConfiguration().get('todoSync.trackedProjects', []);
    }
    async addProject(project) {
        const current = this.getTrackedProjects();
        const without = current.filter(p => p.path !== project.path);
        const updated = [...without, project];
        await vscode.workspace.getConfiguration().update('todoSync.trackedProjects', updated, vscode.ConfigurationTarget.Workspace);
    }
    async removeProjectByPath(path) {
        const current = this.getTrackedProjects();
        const updated = current.filter(p => p.path !== path);
        await vscode.workspace.getConfiguration().update('todoSync.trackedProjects', updated, vscode.ConfigurationTarget.Workspace);
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=configService.js.map