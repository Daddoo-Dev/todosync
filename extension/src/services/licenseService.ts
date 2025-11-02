import * as vscode from 'vscode';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL_KEY = 'todoSync.supabaseUrl';
const SUPABASE_ANON_KEY_KEY = 'todoSync.supabaseAnonKey';

export type LicenseTier = 'free' | 'pro' | 'enterprise';

export interface LicenseInfo {
  tier: LicenseTier;
  isActive: boolean;
  expiresAt: Date | null;
}

export class LicenseService {
  private client: SupabaseClient | null = null;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    const url = await this.getSupabaseUrl();
    const anonKey = await this.getSupabaseAnonKey();
    
    if (url && anonKey) {
      this.client = createClient(url, anonKey);
    }
  }

  private async getSupabaseUrl(): Promise<string | undefined> {
    // Check .env file first
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const envPath = path.join(workspaceFolder.uri.fsPath, '..', '..', '.env');
      try {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          dotenv.config({ path: envPath });
          const url = process.env.SUPABASE_URL;
          if (url) return url;
        }
      } catch (error) {
        // Fall through
      }
    }
    
    // Check VS Code settings
    return vscode.workspace.getConfiguration().get<string>(SUPABASE_URL_KEY);
  }

  private async getSupabaseAnonKey(): Promise<string | undefined> {
    // Check .env file first
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const envPath = path.join(workspaceFolder.uri.fsPath, '..', '..', '.env');
      try {
        if (fs.existsSync(envPath)) {
          dotenv.config({ path: envPath });
          const key = process.env.SUPABASE_ANON_KEY;
          if (key) return key;
        }
      } catch (error) {
        // Fall through
      }
    }
    
    // Check VS Code secrets storage
    return await this.context.secrets.get(SUPABASE_ANON_KEY_KEY);
  }

  async checkLicense(): Promise<LicenseInfo | null> {
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
        tier: data.license_tier as LicenseTier,
        isActive: data.is_active,
        expiresAt
      };
    } catch (error) {
      console.error('License check failed:', error);
      // Fallback to free tier on error
      return { tier: 'free', isActive: true, expiresAt: null };
    }
  }

  private async createDefaultLicense(machineId: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client
        .from('licenses')
        .insert({
          vs_code_machine_id: machineId,
          license_tier: 'free',
          is_active: true
        });
    } catch (error) {
      console.error('Failed to create default license:', error);
    }
  }

  async canLinkNewDatabase(): Promise<boolean> {
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

  async logActivity(action: string, metadata?: any): Promise<void> {
    if (!this.client) return;

    const machineId = vscode.env.machineId;

    try {
      await this.client
        .from('activity_log')
        .insert({
          vs_code_machine_id: machineId,
          action,
          metadata: metadata || {}
        });
    } catch (error) {
      // Silent fail - activity logging shouldn't break the extension
      console.error('Activity logging failed:', error);
    }
  }
}

