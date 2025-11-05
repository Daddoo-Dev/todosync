import * as vscode from 'vscode';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { log } from './log';

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
      const envPath = path.join(workspaceFolder.uri.fsPath, '.env');
      log.debug(`[LICENSE] Looking for .env at: ${envPath}`);
      log.debug(`[LICENSE] .env exists: ${fs.existsSync(envPath)}`);
      try {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const envLines = envContent.split('\n');
          for (const line of envLines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('SUPABASE_URL=')) {
              const url = trimmed.substring('SUPABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
              log.debug(`[LICENSE] Found SUPABASE_URL: ${url}`);
              if (url) return url;
            }
          }
        }
      } catch (error) {
        log.debug(`[LICENSE] Error reading .env: ${error}`);
      }
    }
    
    log.debug(`[LICENSE] No URL in .env, checking settings`);
    // Check VS Code settings
    return vscode.workspace.getConfiguration().get<string>(SUPABASE_URL_KEY);
  }

  private async getSupabaseAnonKey(): Promise<string | undefined> {
    // Check .env file first
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const envPath = path.join(workspaceFolder.uri.fsPath, '.env');
      try {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const envLines = envContent.split('\n');
          for (const line of envLines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('SUPABASE_ANON_KEY=')) {
              const key = trimmed.substring('SUPABASE_ANON_KEY='.length).trim().replace(/^["']|["']$/g, '');
              log.debug(`[LICENSE] Found SUPABASE_ANON_KEY: ${key ? '***' : 'empty'}`);
              if (key) return key;
            }
          }
        }
      } catch (error) {
        log.debug(`[LICENSE] Error reading .env for anon key: ${error}`);
      }
    }
    
    log.debug(`[LICENSE] No anon key in .env, checking secrets`);
    // Check VS Code secrets storage
    return await this.context.secrets.get(SUPABASE_ANON_KEY_KEY);
  }

  async checkLicense(): Promise<LicenseInfo | null> {
    if (!this.client) {
      log.debug(`[LICENSE] Client not initialized, calling initializeClient()`);
      await this.initializeClient();
      if (!this.client) {
        // No backend configured - assume free tier
        log.debug(`[LICENSE] No client after init - returning FREE tier`);
        return { tier: 'free', isActive: true, expiresAt: null };
      }
    }

    const machineId = vscode.env.machineId;
    log.debug(`[LICENSE] Checking license for machine: ${machineId.substring(0, 8)}...`);
    
    try {
      const { data, error } = await this.client
        .from('licenses')
        .select('license_tier, is_active, expires_at')
        .eq('vs_code_machine_id', machineId)
        .single();

      log.debug(`[LICENSE] Query result - error: ${error ? error.message : 'none'}, data: ${data ? JSON.stringify(data) : 'none'}`);

      if (error || !data) {
        // No license found - create free tier entry
        log.debug(`[LICENSE] No license found, creating default FREE license`);
        await this.createDefaultLicense(machineId);
        return { tier: 'free', isActive: true, expiresAt: null };
      }

      // Check if expired
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      const isExpired = expiresAt && expiresAt < new Date();
      
      if (isExpired && data.license_tier !== 'free') {
        return { tier: 'free', isActive: false, expiresAt };
      }

      const result = {
        tier: data.license_tier as LicenseTier,
        isActive: data.is_active,
        expiresAt
      };
      log.debug(`[LICENSE] Returning: ${result.tier.toUpperCase()} - ${result.isActive ? 'Active' : 'Inactive'}`);
      return result;
    } catch (error) {
      log.debug(`[LICENSE] Check failed with exception: ${error}`);
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

