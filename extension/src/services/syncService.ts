import * as vscode from 'vscode';
import * as fs from 'fs';
import { ConfigService, TrackedProject } from './configService';
import { NotionClientWrapper, NotionTask } from '../notion/notionClient';
import { ProjectTreeProvider, TaskItem } from '../tree/projectTreeProvider';
import { log } from './log';
import { LicenseService } from './licenseService';

export class SyncService implements vscode.Disposable {
  private interval: NodeJS.Timeout | undefined;
  private disposed = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly config: ConfigService,
    private readonly tree: ProjectTreeProvider,
    private readonly license: LicenseService | undefined
  ) {}

  dispose(): void {
    this.disposed = true;
    if (this.interval) clearInterval(this.interval);
  }

  startAutoRefresh() {
    const minutes = vscode.workspace.getConfiguration().get<number>('todoSync.refreshIntervalMinutes', 5);
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.syncCurrentWorkspace(), minutes * 60 * 1000);

    log.debug(`Auto-refresh started: every ${minutes} minute(s)`);
    this.syncCurrentWorkspace();
    this.context.subscriptions.push(vscode.window.onDidChangeWindowState(e => { if (e.focused) this.syncCurrentWorkspace(); }));
    this.context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => this.syncCurrentWorkspace()));
  }

  async linkCurrentWorkspaceToDatabase(): Promise<void> {
    const apiKey = await this.config.getApiKey();
    if (!apiKey) {
      vscode.window.showWarningMessage('ToDoSync: Set Notion API key first.', 'Set API Key')
        .then(sel => sel && vscode.commands.executeCommand('todo-sync.setApiKey'));
      return;
    }

    const client = new NotionClientWrapper(apiKey);
    
    let dbs: { id: string; title: string }[] = [];
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'ToDoSync: Loading databases...',
      cancellable: false
    }, async () => {
      dbs = await client.listDatabases();
    });
    
    if (dbs.length === 0) {
      vscode.window.showWarningMessage('ToDoSync: No Notion databases accessible with this API key.');
      return;
    }
    const pick = await vscode.window.showQuickPick(
      dbs.map(d => ({ label: d.title, description: d.id })),
      { placeHolder: 'Select Notion database to link to this workspace' }
    );
    if (!pick) return;

    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showErrorMessage('ToDoSync: No workspace folder found.');
      return;
    }

    const selectedDbId = pick.description ?? '';

    // Check if database has a Project property for centralized mode
    const hasProjectProp = await client.hasProjectProperty(selectedDbId);
    let projectName = folder.name;
    
    if (hasProjectProp) {
      let projectOptions: string[] = [];
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'ToDoSync: Loading projects...',
        cancellable: false
      }, async () => {
        projectOptions = await client.getProjectOptions(selectedDbId);
      });
      
      const items: vscode.QuickPickItem[] = [
        ...projectOptions.map(p => ({ label: p, description: 'Existing project' })),
        { label: '$(add) Create new project', description: 'Enter a custom project name' }
      ];
      
      const projectPick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select project or create new one (this filters tasks in the centralized database)'
      });
      
      if (!projectPick) return;
      
      if (projectPick.label === '$(add) Create new project') {
        const customName = await vscode.window.showInputBox({
          prompt: 'Enter project name',
          value: folder.name,
          ignoreFocusOut: true
        });
        if (!customName || !customName.trim()) return;
        projectName = customName.trim();
      } else {
        projectName = projectPick.label;
      }
      
      vscode.window.showInformationMessage(
        `ToDoSync: Using centralized database with project filter "${projectName}"`
      );
    }

    // Freemium check: Free tier limited to 1 project (database + project combination)
    if (this.license) {
      const license = await this.license.checkLicense();
      
      if (license?.tier === 'free') {
        const currentProjects = this.config.getTrackedProjects();
        
        // Count unique project configurations (database + projectName combinations)
        // Each unique combination counts as a separate project
        const uniqueProjectConfigs = new Set(
          currentProjects.map(p => `${p.notionDatabaseId}::${p.projectName}`)
        );
        
        // Check if this is a new project configuration
        const newConfigKey = `${selectedDbId}::${projectName}`;
        
        if (!uniqueProjectConfigs.has(newConfigKey) && uniqueProjectConfigs.size >= 1) {
          const choice = await vscode.window.showWarningMessage(
            'ToDoSync Free: You can only sync 1 project. Upgrade to Pro for unlimited projects.',
            'Upgrade to Pro',
            'Cancel'
          );
          if (choice === 'Upgrade to Pro') {
            // Open Stripe payment link with machine ID
            const machineId = vscode.env.machineId;
            const paymentUrl = `https://buy.stripe.com/14A3cu3Xu5jy3DG3C1gEg01?client_reference_id=${machineId}`;
            vscode.env.openExternal(vscode.Uri.parse(paymentUrl));
            
            // Prompt user to refresh license after purchase
            vscode.window.showInformationMessage(
              'After completing your purchase, run "ToDoSync: Refresh License Status" to activate Pro features.',
              'Got it'
            );
          }
          return;
        }
      }
    }

    const project: TrackedProject = {
      path: folder.uri.fsPath,
      notionDatabaseId: selectedDbId,
      projectName: projectName
    };
    const statusOptions = await client.getStatusOptions(project.notionDatabaseId);
    project.statusOptions = statusOptions;
    await this.config.addProject(project);
    
    // Log activity
    await this.license?.logActivity('link_database', { workspace: folder.name });
    
    log.debug(`Linked workspace '${folder.name}' to database ${project.notionDatabaseId} with project filter "${projectName}" and ${statusOptions.length} status option(s)`);
    await this.syncCurrentWorkspace();
  }

  async syncCurrentWorkspace(showNotification: boolean = false): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;
    const tracked = this.config.getTrackedProjects().find(p => p.path === folder.uri.fsPath);
    if (!tracked) {
      this.tree.setItems([]);
      return;
    }
    const apiKey = await this.config.getApiKey();
    if (!apiKey) return;
    
    try {
      await vscode.window.withProgress({
        location: showNotification ? vscode.ProgressLocation.Notification : vscode.ProgressLocation.Window,
        title: 'ToDoSync: Syncing...',
        cancellable: false
      }, async (progress) => {
        progress.report({ message: 'Connecting to Notion...' });
        
        const client = new NotionClientWrapper(apiKey);
        this.tree.setNotionClient(client);
        if (!tracked.statusOptions) {
          tracked.statusOptions = await client.getStatusOptions(tracked.notionDatabaseId);
          await this.config.addProject(tracked);
        }
        
        progress.report({ message: 'Fetching tasks...' });
        
        // Check if database has Project property - if so, filter by projectName
        const hasProjectProp = await client.hasProjectProperty(tracked.notionDatabaseId);
        const projectFilter = hasProjectProp ? tracked.projectName : undefined;
        
        const tasks = await client.getTasks(tracked.notionDatabaseId, 200, projectFilter);
        const items = this.toTaskItems(tasks, tracked);
        this.tree.setItems(items);
        log.debug(`Synced ${items.length} task(s) for workspace '${folder.name}' ${projectFilter ? `(project: ${projectFilter})` : ''}`);
        
        // Show notification only for manual sync (not auto-refresh)
        if (showNotification) {
          vscode.window.showInformationMessage(`ToDoSync: Synced ${items.length} task(s)${projectFilter ? ` for ${projectFilter}` : ''}`);
        }
      });
    } catch (error: any) {
      const errorMsg = error.message || error.toString();
      log.debug(`Sync failed: ${errorMsg}`);
      
      const action = await vscode.window.showErrorMessage(
        `ToDoSync: Sync failed - ${errorMsg}`,
        'Retry',
        'Dismiss'
      );
      
      if (action === 'Retry') {
        await this.syncCurrentWorkspace(showNotification);
      }
    }
  }

  async syncAllWorkspaces(showNotification: boolean = false): Promise<void> {
    await this.syncCurrentWorkspace(showNotification);
  }

  async deleteTask(item: TaskItem): Promise<void> {
    const apiKey = await this.config.getApiKey();
    if (!apiKey) {
      vscode.window.showWarningMessage('ToDoSync: No API key found. Set it first.');
      return;
    }
    
    const confirm = await vscode.window.showWarningMessage(
      `Delete task "${item.title}"?`,
      { modal: true },
      'Delete',
      'Cancel'
    );
    
    if (confirm !== 'Delete') return;
    
    try {
      const client = new NotionClientWrapper(apiKey);
      await client.deleteTask(item.id);
      vscode.window.showInformationMessage(`ToDoSync: Deleted "${item.title}"`);
      log.debug(`Deleted task: ${item.title} (${item.id})`);
      await this.syncCurrentWorkspace();
    } catch (error: any) {
      const errorMsg = error.message || error.toString();
      log.debug(`Failed to delete task: ${errorMsg}`);
      
      const action = await vscode.window.showErrorMessage(
        `ToDoSync: Failed to delete task - ${errorMsg}`,
        'Retry',
        'Dismiss'
      );
      
      if (action === 'Retry') {
        await this.deleteTask(item);
      }
    }
  }

  async toggleStatus(item: TaskItem): Promise<void> {
    const apiKey = await this.config.getApiKey();
    if (!apiKey) {
      vscode.window.showWarningMessage('ToDoSync: No API key found. Set it first.');
      return;
    }
    const client = new NotionClientWrapper(apiKey);
    const tracked = this.config.getTrackedProjects().find(p => p.path === item.project.path);
    
    // Ensure statusOptions are loaded
    let statusOptions = tracked?.statusOptions;
    if (!statusOptions || statusOptions.length === 0) {
      if (tracked) {
        statusOptions = await client.getStatusOptions(tracked.notionDatabaseId);
        tracked.statusOptions = statusOptions;
        await this.config.addProject(tracked);
      } else {
        statusOptions = [
          { name: 'Not started', color: 'gray' },
          { name: 'In progress', color: 'blue' },
          { name: 'Done', color: 'green' }
        ];
      }
    }
    
    const statuses = statusOptions.map(opt => ({
      label: `${client.getStatusEmoji(opt.name, statusOptions)} ${opt.name}`,
      value: opt.name,
      description: opt.name === item.status ? 'Current status' : undefined
    }));
    
    const pick = await vscode.window.showQuickPick(statuses, {
      placeHolder: `Change status for "${item.title}"`,
      ignoreFocusOut: true,
      canPickMany: false,
    });
    
    if (!pick || pick.value === item.status) return;
    
    try {
      await client.updateStatus(item.id, pick.value);
      log.debug(`Updated status -> ${pick.value} for task ${item.id}`);
      vscode.window.showInformationMessage(`ToDoSync: Updated "${item.title}" to ${pick.value}`);
      await this.syncCurrentWorkspace();
    } catch (error: any) {
      const errorMsg = error.message || error.toString();
      log.debug(`Failed to update status: ${errorMsg}`);
      
      const action = await vscode.window.showErrorMessage(
        `ToDoSync: Failed to update status - ${errorMsg}`,
        'Retry',
        'Dismiss'
      );
      
      if (action === 'Retry') {
        await this.toggleStatus(item);
      }
    }
  }

  async addTask(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showErrorMessage('ToDoSync: No workspace folder found.');
      return;
    }
    
    const tracked = this.config.getTrackedProjects().find(p => p.path === folder.uri.fsPath);
    if (!tracked) {
      vscode.window.showWarningMessage('ToDoSync: Link this workspace to a Notion database first.', 'Link Project')
        .then(sel => sel && vscode.commands.executeCommand('todo-sync.linkProject'));
      return;
    }
    
    const apiKey = await this.config.getApiKey();
    if (!apiKey) {
      vscode.window.showWarningMessage('ToDoSync: Set Notion API key first.', 'Set API Key')
        .then(sel => sel && vscode.commands.executeCommand('todo-sync.setApiKey'));
      return;
    }
    
    const title = await vscode.window.showInputBox({
      prompt: 'Enter task title',
      placeHolder: 'Add Task',
      ignoreFocusOut: true,
    });
    
    if (!title || !title.trim()) return;
    
    const client = new NotionClientWrapper(apiKey);
    
    // Get default status (first status option or "Not started")
    let defaultStatus = 'Not started';
    if (tracked.statusOptions && tracked.statusOptions.length > 0) {
      defaultStatus = tracked.statusOptions[0].name;
    }
    
    // Check if database has Project property - if so, include project name
    const hasProjectProp = await client.hasProjectProperty(tracked.notionDatabaseId);
    const projectName = hasProjectProp ? tracked.projectName : undefined;
    
    try {
      await client.createTask(tracked.notionDatabaseId, title.trim(), defaultStatus, projectName);
      vscode.window.showInformationMessage(`ToDoSync: Task "${title.trim()}" added.`);
      await this.syncCurrentWorkspace();
    } catch (error: any) {
      const errorMsg = error.message || error.toString();
      log.debug(`Failed to add task: ${errorMsg}`);
      
      const action = await vscode.window.showErrorMessage(
        `ToDoSync: Failed to add task - ${errorMsg}`,
        'Retry',
        'Dismiss'
      );
      
      if (action === 'Retry') {
        await this.addTask();
      }
    }
  }

  async importTasks(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      vscode.window.showErrorMessage('ToDoSync: No workspace folder found.');
      return;
    }
    
    const tracked = this.config.getTrackedProjects().find(p => p.path === folder.uri.fsPath);
    if (!tracked) {
      vscode.window.showWarningMessage('ToDoSync: Link this workspace to a Notion database first.', 'Link Project')
        .then(sel => sel && vscode.commands.executeCommand('todo-sync.linkProject'));
      return;
    }
    
    const apiKey = await this.config.getApiKey();
    if (!apiKey) {
      vscode.window.showWarningMessage('ToDoSync: Set Notion API key first.', 'Set API Key')
        .then(sel => sel && vscode.commands.executeCommand('todo-sync.setApiKey'));
      return;
    }
    
    // Prompt for file
    const fileUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { 'Markdown': ['md'], 'Text': ['txt'], 'All Files': ['*'] },
      openLabel: 'Import Tasks',
      title: 'Select task file to import'
    });
    
    if (!fileUri || fileUri.length === 0) return;
    
    const filePath = fileUri[0].fsPath;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    log.debug(`[Import] File path: ${filePath}`);
    log.debug(`[Import] File size: ${fileContent.length} chars`);
    log.debug(`[Import] First 200 chars: ${fileContent.substring(0, 200)}`);
    
    // Parse tasks from markdown
    const tasks = this.parseTasksFromMarkdown(fileContent);
    
    log.debug(`[Import] Found ${tasks.length} tasks`);
    
    if (tasks.length === 0) {
      vscode.window.showWarningMessage('ToDoSync: No tasks found in file. Use markdown checkboxes: - [ ] Task name');
      return;
    }
    
    // Show preview and confirm
    const confirm = await vscode.window.showInformationMessage(
      `ToDoSync: Found ${tasks.length} task(s) to import. Continue?`,
      { modal: true },
      'Import',
      'Cancel'
    );
    
    if (confirm !== 'Import') return;
    
    // Import tasks
    const client = new NotionClientWrapper(apiKey);
    
    // Get database properties to validate metadata
    const hasProjectProp = await client.hasProjectProperty(tracked.notionDatabaseId);
    const projectName = hasProjectProp ? tracked.projectName : undefined;
    
    // Pre-fetch database info and project ID once (instead of for every task)
    const dbInfo = await client.getDatabaseInfo(tracked.notionDatabaseId);
    log.debug(`[Import] Database is multi-datasource: ${dbInfo.isMultiDatasource}`);
    
    let projectId: string | undefined = undefined;
    if (projectName && dbInfo.isMultiDatasource) {
      log.debug(`[Import] Looking up project: "${projectName}"`);
      const projects = await client.getProjectOptionsWithIds(tracked.notionDatabaseId);
      log.debug(`[Import] Found ${projects.length} projects: ${projects.map(p => `"${p.name}"`).join(', ')}`);
      const project = projects.find(p => p.name === projectName);
      projectId = project?.id;
      if (!projectId) {
        log.debug(`[Import] ⚠️ Project "${projectName}" not found! Available: ${projects.map(p => p.name).join(', ')}`);
      } else {
        log.debug(`[Import] ✓ Pre-fetched project ID: ${projectId} for "${projectName}"`);
      }
    }
    
    let successCount = 0;
    let failCount = 0;
    
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Importing tasks...',
      cancellable: false
    }, async (progress) => {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        progress.report({ 
          increment: (100 / tasks.length),
          message: `${i + 1}/${tasks.length}: ${task.title.substring(0, 30)}...`
        });
        
        log.debug(`[Import] Creating task ${i + 1}: title="${task.title}", status="${task.status}", project="${projectName}" (ID: ${projectId})`);
        
        try {
          await client.createTask(
            tracked.notionDatabaseId,
            task.title,
            task.status,
            projectName,
            projectId, // Pass pre-fetched project ID to avoid expensive lookup
            dbInfo,    // Pass pre-fetched database info to avoid 23 API calls
            task.metadata.category  // Pass category from markdown section headers
          );
          successCount++;
          log.debug(`[Import] ✓ Task ${i + 1} created successfully`);
        } catch (error: any) {
          log.debug(`[Import] ✗ Task ${i + 1} failed: ${error.message || error}`);
          failCount++;
        }
      }
    });
    
    // Show results
    if (failCount === 0) {
      vscode.window.showInformationMessage(`ToDoSync: Successfully imported ${successCount} task(s).`);
    } else {
      vscode.window.showWarningMessage(`ToDoSync: Imported ${successCount} task(s), ${failCount} failed. Check Output for details.`);
    }
    
    await this.syncCurrentWorkspace();
  }

  private parseTasksFromMarkdown(content: string): Array<{ title: string; status: string; metadata: any }> {
    // Split by any line ending (handles CRLF, LF, or CR)
    const lines = content.split(/\r?\n|\r/);
    const tasks: Array<{ title: string; status: string; metadata: any }> = [];
    
    // Regex for markdown checkboxes: - [ ] or - [x] or * [ ] or * [x]
    const taskRegex = /^[\s]*[-*]\s*\[([ xX])\]\s*(.+)$/;
    
    // Regex for section headers: ## Category Name (with optional emoji)
    const headerRegex = /^##\s+(?:[🎯📦🐛📚✨🔧🌟🚀💡⚙️🎨📊🔐🌐]+\s+)?(.+)$/;
    
    let currentCategory: string | undefined = undefined;
    
    for (const line of lines) {
      // Check for category header
      const headerMatch = line.match(headerRegex);
      if (headerMatch) {
        currentCategory = headerMatch[1].trim();
        continue;
      }
      
      const match = line.match(taskRegex);
      if (!match) continue;
      
      const checked = match[1].toLowerCase() === 'x';
      let taskText = match[2].trim();
      
      // Extract metadata tags
      const metadata: any = {};
      
      // @status:Status Name (handles multi-word statuses like "Not started")
      const statusMatch = taskText.match(/@status:(.+?)(?:\s+@|$)/);
      if (statusMatch) {
        metadata.status = statusMatch[1].trim();
        taskText = taskText.replace(/@status:.+?(?=\s+@|$)/, '').trim();
      }
      
      // @priority:Priority Name
      const priorityMatch = taskText.match(/@priority:(.+?)(?:\s+@|$)/);
      if (priorityMatch) {
        metadata.priority = priorityMatch[1].trim();
        taskText = taskText.replace(/@priority:.+?(?=\s+@|$)/, '').trim();
      }
      
      // @due:YYYY-MM-DD
      const dueMatch = taskText.match(/@due:(\d{4}-\d{2}-\d{2})/);
      if (dueMatch) {
        metadata.due = dueMatch[1];
        taskText = taskText.replace(dueMatch[0], '').trim();
      }
      
      // @category:CategoryName
      const categoryMatch = taskText.match(/@category:(.+?)(?:\s+@|$)/);
      if (categoryMatch) {
        metadata.category = categoryMatch[1].trim();
        taskText = taskText.replace(/@category:.+?(?=\s+@|$)/, '').trim();
      } else if (currentCategory) {
        // Use section header as category if no explicit @category tag
        metadata.category = currentCategory;
      }
      
      // Determine status
      let status = 'Not started';
      if (metadata.status) {
        status = metadata.status;
      } else if (checked) {
        status = 'Done';
      }
      
      tasks.push({
        title: taskText,
        status: status,
        metadata: metadata
      });
      
      log.debug(`[Parse] Task: "${taskText}", status: "${status}", category: "${metadata.category || 'none'}"`);
    }
    
    log.debug(`[Parse] Total parsed: ${tasks.length} tasks`);
    return tasks;
  }

  private toTaskItems(tasks: NotionTask[], project: TrackedProject): TaskItem[] {
    return tasks.map(t => ({ 
      id: t.id, 
      title: t.title, 
      status: t.status, 
      category: t.category,
      project 
    }));
  }

  private nextStatus(current: string): 'Not started' | 'In progress' | 'Done' {
    if (current === 'Not started') return 'In progress';
    if (current === 'In progress') return 'Done';
    return 'Not started';
  }
}


