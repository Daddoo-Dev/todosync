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
exports.LicenseService = void 0;
const vscode = __importStar(require("vscode"));
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SUPABASE_URL_KEY = 'todoSync.supabaseUrl';
const SUPABASE_ANON_KEY_KEY = 'todoSync.supabaseAnonKey';
class LicenseService {
    constructor(context) {
        this.client = null;
        this.context = context;
        this.initializeClient();
    }
    async initializeClient() {
        const url = await this.getSupabaseUrl();
        const anonKey = await this.getSupabaseAnonKey();
        if (url && anonKey) {
            this.client = (0, supabase_js_1.createClient)(url, anonKey);
        }
    }
    async getSupabaseUrl() {
        // Check .env file first
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const envPath = path.join(workspaceFolder.uri.fsPath, '..', '..', '.env');
            try {
                if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    dotenv.config({ path: envPath });
                    const url = process.env.SUPABASE_URL;
                    if (url)
                        return url;
                }
            }
            catch (error) {
                // Fall through
            }
        }
        // Check VS Code settings
        return vscode.workspace.getConfiguration().get(SUPABASE_URL_KEY);
    }
    async getSupabaseAnonKey() {
        // Check .env file first
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const envPath = path.join(workspaceFolder.uri.fsPath, '..', '..', '.env');
            try {
                if (fs.existsSync(envPath)) {
                    dotenv.config({ path: envPath });
                    const key = process.env.SUPABASE_ANON_KEY;
                    if (key)
                        return key;
                }
            }
            catch (error) {
                // Fall through
            }
        }
        // Check VS Code secrets storage
        return await this.context.secrets.get(SUPABASE_ANON_KEY_KEY);
    }
    async checkLicense() {
        if (!this.client) {
            await this.initializeClient();
            if (!this.client) {
                // No backend configured - assume free tier
                return { tier: 'free', isActive: true, expiresAt: null };
            }
        }
        const machineId = vscode.env.machineId;
        try {
            const { data, error } = await this.client
                .from('licenses')
                .select('license_tier, is_active, expires_at')
                .eq('vs_code_machine_id', machineId)
                .single();
            if (error || !data) {
                // No license found - create free tier entry
                await this.createDefaultLicense(machineId);
                return { tier: 'free', isActive: true, expiresAt: null };
            }
            // Check if expired
            const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
            const isExpired = expiresAt && expiresAt < new Date();
            if (isExpired && data.license_tier !== 'free') {
                return { tier: 'free', isActive: false, expiresAt };
            }
            return {
                tier: data.license_tier,
                isActive: data.is_active,
                expiresAt
            };
        }
        catch (error) {
            console.error('License check failed:', error);
            // Fallback to free tier on error
            return { tier: 'free', isActive: true, expiresAt: null };
        }
    }
    async createDefaultLicense(machineId) {
        if (!this.client)
            return;
        try {
            await this.client
                .from('licenses')
                .insert({
                vs_code_machine_id: machineId,
                license_tier: 'free',
                is_active: true
            });
        }
        catch (error) {
            console.error('Failed to create default license:', error);
        }
    }
    async canLinkNewDatabase() {
        const license = await this.checkLicense();
        // Free tier: max 1 database
        // Pro/Enterprise: unlimited
        if (!license || !license.isActive) {
            return false;
        }
        if (license.tier === 'free') {
            // Check how many databases they've already linked
            // This will be handled in syncService by checking global state
            return true; // We'll enforce elsewhere
        }
        return true;
    }
    async logActivity(action, metadata) {
        if (!this.client)
            return;
        const machineId = vscode.env.machineId;
        try {
            await this.client
                .from('activity_log')
                .insert({
                vs_code_machine_id: machineId,
                action,
                metadata: metadata || {}
            });
        }
        catch (error) {
            // Silent fail - activity logging shouldn't break the extension
            console.error('Activity logging failed:', error);
        }
    }
}
exports.LicenseService = LicenseService;
//# sourceMappingURL=licenseService.js.map