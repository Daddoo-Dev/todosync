# ToDoSync - Comprehensive User Guide

Complete guide to getting the most out of ToDoSync.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Initial Setup](#initial-setup)
- [Basic Workflows](#basic-workflows)
  - [Creating a Task](#creating-a-task)
  - [Changing Task Status](#changing-task-status)
  - [Deleting a Task](#deleting-a-task)
  - [Syncing Tasks](#syncing-tasks)
  - [Using the Ask AI Sparkle Button](#using-the-ask-ai-sparkle-button)
- [Advanced Features](#advanced-features)
  - [Bulk Import from Markdown](#bulk-import-from-markdown)
  - [Multi-Project Management](#multi-project-management)
  - [Using Multiple Databases](#using-multiple-databases)
- [Centralized Mode](#centralized-mode)
  - [Overview](#overview)
  - [Real-World Example](#real-world-example)
  - [Creating New Projects](#creating-new-projects)
  - [Best Practices for Centralized Mode](#best-practices-for-centralized-mode)
- [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Default Shortcuts](#default-shortcuts)
  - [Customizing Shortcuts](#customizing-shortcuts)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Performance Issues](#performance-issues)
  - [Connection Errors](#connection-errors)
  - [Permission Errors](#permission-errors)
  - [Data Sync Issues](#data-sync-issues)
  - [Import Issues](#import-issues)
  - [Debug Logging](#debug-logging)
- [Best Practices](#best-practices)
  - [Workflow Optimization](#workflow-optimization)
  - [Task Writing Tips](#task-writing-tips)
  - [Project Structure](#project-structure)
  - [Maintenance](#maintenance)
- [FAQ](#faq)
  - [General Questions](#general-questions)
  - [Pricing & Licensing](#pricing--licensing)
  - [Technical Questions](#technical-questions)
  - [Database Setup Questions](#database-setup-questions)

---

## Getting Started

### Prerequisites

- VS Code or Cursor (version 1.84.0 or higher)
- A Notion account
- A Notion database with at least a Title and Status property

### Initial Setup

#### Step 1: Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Give it a name (e.g., "ToDoSync")
4. Select your workspace
5. Click **Submit**
6. **Copy the Internal Integration Token** (starts with `secret_`)
7. Keep this token safe - you'll need it in VS Code

#### Step 2: Share Your Database

1. Open your Notion database
2. Click **Share** in the top right
3. Click **Invite**
4. Search for your integration name ("ToDoSync")
5. Click **Invite**
6. Verify the integration appears in the shared list

#### Step 3: Configure ToDoSync

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type: `ToDoSync: Set Notion API Key`
4. Paste your integration token
5. Press Enter

#### Step 4: Link Your First Project

1. Open your project folder in VS Code
2. Press `Ctrl+Shift+P`
3. Type: `ToDoSync: Link Project`
4. Select your Notion database from the list
5. If your database has a Project property, select a project or create a new one
6. Wait for initial sync to complete

> 💡 The ToDoSync panel now guides you through these steps in order—if you ever forget what’s next, just look at the inline checklist (Add API Key → Connect Workspace → Add Tasks).

**You're all set!** Tasks will now appear in the ToDoSync sidebar.

---

## Basic Workflows

### Creating a Task

**Method 1: Keyboard Shortcut (Fastest)**
1. Press `Ctrl+Shift+T`
2. Type task name
3. Press Enter

**Method 2: Sidebar Button**
1. Click **Add Task** in the ToDoSync sidebar
2. Type task name
3. Press Enter

**Method 3: Command Palette**
1. Press `Ctrl+Shift+P`
2. Type: `ToDoSync: Add Task`
3. Enter task name

**Result:** Task appears in both VS Code and Notion with:
- Default status ("Not started")
- Current project (if using centralized mode)
- Timestamp

### Changing Task Status

**Method 1: Click Task (Fastest)**
1. Click on any task in the sidebar
2. Select new status from the dropdown
3. Click or press Enter

**Method 2: Right-Click**
1. Right-click a task
2. Select "Change Status"
3. Choose new status

**Status Options:**
- ⚪ Not started (default)
- 🔵 In progress
- 🟢 Done
- (Custom statuses from your Notion database)

### Deleting a Task

1. Right-click a task in the sidebar
2. Click **Delete Task**
3. Confirm deletion

**Note:** This archives the task in Notion (not permanent deletion). You can restore it from Notion's Archive.

### Syncing Tasks

**Automatic Sync:**
- Every 5 minutes (configurable)
- When you focus the VS Code window
- After creating, updating, or deleting a task

**Manual Sync:**
- Press `F5` in VS Code
- Click the **Refresh** button in ToDoSync toolbar
- Command Palette: `ToDoSync: Sync Now`

### Using the Ask AI Sparkle Button

Need to hand a task off to an AI assistant? Use the ✨ Ask AI workflow:

1. Hover over any task in the ToDoSync sidebar to reveal the ✨ inline button.
2. Click ✨ to copy that task’s full payload to the clipboard (title, status, category, project info, plus the `.todosync/tasks.json` mirror path).
3. Paste directly into your AI chat so it can open the local JSON snapshot and get to work.

Other access points:

- Toolbar button: Click the ✨ icon in the ToDoSync panel header to choose a task from a quick pick list.
- Command Palette: Run `ToDoSync: ✨ Ask AI (Copy Task Snapshot)` to trigger the same picker.

Tips:

- Make sure you’ve synced recently so the `.todosync/tasks.json` file is fresh.
- When no task is selected, the picker shows every synced task with its status + category for fast filtering.

---

## Advanced Features

### Bulk Import from Markdown

Create multiple tasks at once from a markdown file.

#### 1. Create a Markdown File

```markdown
# My Project Tasks

## High Priority
- [ ] Fix login bug
- [ ] Update documentation
- [x] Deploy to production

## Low Priority
- [ ] Refactor old code @status:Not started
- [ ] Add dark mode @status:In progress
```

#### 2. Import the File

1. Press `Ctrl+Shift+P`
2. Type: `ToDoSync: Import Tasks from File`
3. Select your markdown file
4. Confirm the import

#### 3. Optional Metadata Tags

Add metadata to tasks using @ tags:

- `@status:StatusName` - Set specific status
  - Example: `- [ ] Fix bug @status:In progress`
- `@priority:High` - Set priority (if your DB has a Priority property)
- `@due:2025-12-31` - Set due date (if your DB has a Due Date property)

**Import Rules:**
- Only lines with checkboxes (`- [ ]` or `- [x]`) are imported
- Headers (`## Section`) are ignored (just for organization)
- `[x]` checked boxes import as "Done" status
- `[ ]` unchecked boxes use default status
- Category names and notes are ignored

### Multi-Project Management

#### Viewing All Tracked Projects

1. Press `Ctrl+Shift+P`
2. Type: `ToDoSync: View Tracked Projects`
3. Select a project to:
   - **Open in Notion** - Opens project database in browser
   - **Unlink Project** - Removes the link from VS Code

#### Switching Between Projects

Simply open different workspace folders in VS Code. Each workspace remembers its linked Notion database and project filter.

**Example Workflow:**
- `C:\Projects\MyApp` → Linked to "Tasks Tracker" → Project: "MyApp"
- `C:\Projects\Website` → Linked to "Tasks Tracker" → Project: "Website"
- `C:\Projects\Research` → Linked to "Research Tasks" → No project filter

### Using Multiple Databases

**Free Tier:** 1 project (database + project combination)

**Pro Tier:** Unlimited projects and databases

**Mix and Match:**
- Some workspaces use centralized database with project filters
- Others use dedicated databases
- Totally flexible

---

## Centralized Mode

Centralized Mode lets you use ONE Notion database for ALL your projects.

### Why Use Centralized Mode?

**Benefits:**
- Single source of truth for all tasks
- Easy to see workload across projects
- Consistent task structure
- Simpler Notion workspace organization

**When to Use:**
- You have 3+ coding projects
- You want cross-project visibility
- You prefer everything in one place

**When NOT to Use:**
- Very different task types (personal vs work)
- Need completely separate permission sets
- Client projects that shouldn't mix

### Setting Up Centralized Mode

#### 1. Database Requirements

Your database needs:
- **Title property** (e.g., "Task name")
- **Status property** with status options
- **Project property (Relation type)** - This is the key!

#### 2. Create Projects Database

1. In your main database, add a property
2. Name it "Project"
3. Type: **Relation**
4. Click "+ Create a new database"
5. Name it "Projects"
6. Done!

#### 3. Add Your Projects

1. Open the Projects database (linked from your tasks database)
2. Add rows for each of your coding projects:
   - TodoSync
   - MyPortfolio
   - ClientWebsite
   - etc.

#### 4. Link Workspaces

For each coding project folder:

1. Open the folder in VS Code
2. Run: `ToDoSync: Link Project`
3. Select "Tasks Tracker" (your centralized database)
4. **Select the matching project** from the dropdown
5. Done! That workspace now shows only tasks for that project

### Example Setup

**Your Notion:**
- **Tasks Tracker** database with Project relation
- **Projects** database with: TodoSync, MyApp, Website

**Your VS Code Workspaces:**
- `C:\Code\todosync` → Tasks Tracker → TodoSync
- `C:\Code\myapp` → Tasks Tracker → MyApp  
- `C:\Code\website` → Tasks Tracker → Website

Each workspace sees ONLY its own tasks, but all tasks live in one Notion database.

---

## Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+Shift+T` (Mac: `Cmd+Shift+T`) | Add Task | Create a new task |
| `F5` | Sync Now | Manually refresh tasks |

**Tips:**
- Shortcuts work when VS Code is focused
- `Ctrl+Shift+T` overrides default "Reopen Closed Tab" - if you need that, you can remove the keybinding

---

## Troubleshooting

### Common Issues

#### "No Notion databases accessible with this API key"

**Causes:**
- API key is incorrect
- No databases are shared with the integration

**Solutions:**
1. Verify your API key is correct
2. Check that you shared at least one database with your integration
3. Try running `ToDoSync: Set Notion API Key` again

#### "Database not shared with integration"

**Cause:** The database wasn't shared with your Notion integration.

**Solution:**
1. Open the database in Notion
2. Click **Share** → **Invite**
3. Select your integration
4. Run `ToDoSync: Sync Now`

#### Tasks Not Showing Up

**Possible Causes:**
1. Database is empty
2. Project filter is excluding tasks
3. Tasks don't have the Project relation set

**Solutions:**
1. Check Notion - do tasks exist?
2. Verify tasks have the correct Project relation (for centralized mode)
3. Run `ToDoSync: Sync Now`
4. Enable debug logging and check Output panel

#### "No project property found"

**Cause:** Your database doesn't have a Project property, or it's the wrong type.

**Solution:**
- For centralized mode: Add a "Project" property of type **Relation**
- For basic mode: This is normal - you don't need a Project property

#### Sync Is Slow

**Normal Speed:**
- First sync: 2-5 seconds
- Subsequent syncs: 1-2 seconds
- Import: ~1 second per task

**If Slower:**
1. Check your internet connection
2. Notion may be experiencing slowdowns
3. Large databases (500+ tasks) will be slower

#### Extension Not Activating

**Solutions:**
1. Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Check if extension is enabled: Extensions panel → ToDoSync
3. Check for VS Code updates
4. Reinstall the extension

### Debug Logging

Enable detailed logging to diagnose issues:

1. Open Settings: `Ctrl+,` (or `Cmd+,`)
2. Search: `todoSync.enableDebug`
3. Check the box
4. Run the failing operation
5. View Output: `Ctrl+Shift+U` → Select "ToDoSync" from dropdown
6. Copy relevant logs when reporting issues

---

## Best Practices

### Task Organization

**DO:**
- ✅ Use consistent project names across VS Code and Notion
- ✅ Keep task titles concise (detailed notes go in Notion description)
- ✅ Use status to track progress
- ✅ Archive completed tasks periodically in Notion

**DON'T:**
- ❌ Create duplicate project names in Notion
- ❌ Rename the Status or Title properties after linking
- ❌ Delete tasks frequently (archive in Notion instead)
- ❌ Link the same workspace to multiple databases

### Performance Tips

**For Large Databases (100+ tasks):**
- Use centralized mode with project filtering (shows only relevant tasks)
- Keep completed tasks in a separate "Archive" status or database
- Consider splitting very large projects into sub-projects

**For Bulk Imports:**
- Import during off-hours if importing 100+ tasks
- Break large imports into batches of 50-100
- Use `@status:StatusName` tags to organize imported tasks

### Security

**API Key Storage:**
- **Recommended:** Use the built-in Secret Storage (`ToDoSync: Set Notion API Key`)
- **Teams:** Use `.env` file (add to `.gitignore`!)
- **Never:** Commit API keys to git

**Permissions:**
- Only share databases that contain work tasks
- Don't share personal Notion pages with the integration
- Review integration permissions periodically in Notion settings

---

## FAQ

### General Questions

**Q: Is my data stored locally?**
A: No. ToDoSync syncs directly with Notion. Your tasks live in Notion; VS Code just displays them.

**Q: Can I use ToDoSync offline?**
A: No. ToDoSync requires an internet connection to sync with Notion. Tasks won't appear without connectivity.

**Q: Does ToDoSync support subtasks?**
A: Not yet. This is planned for a future release.

**Q: Can I customize the auto-refresh interval?**
A: Yes! Settings → `todoSync.refreshIntervalMinutes` (default: 5 minutes)

### Pricing & Licensing

**Q: What does the Free tier include?**
A: Full features, unlimited tasks, but only 1 project (database + project filter combination).

**Q: What's the difference between Free and Pro?**
A: Pro tier allows unlimited projects. Everything else is the same.

**Q: Can I try Pro before buying?**
A: Yes! Use coupon code `SYNCAHOLIC` for 100% off for one year.

**Q: How do I upgrade?**
A: Click "Upgrade to Pro" when prompted, or visit the payment link in the README.

**Q: What happens if my Pro subscription expires?**
A: You'll revert to Free tier (1 project limit). Existing linked projects remain, but you can't add new ones.

### Technical Questions

**Q: Which Notion API version does ToDoSync use?**
A: 2025-09-03 (the latest version with multi-datasource support)

**Q: Does ToDoSync support Notion's new database views?**
A: Yes! ToDoSync works with both traditional databases and multi-datasource databases.

**Q: Can I use ToDoSync with GitHub Projects or Jira?**
A: Not yet. Currently only Notion is supported.

**Q: Does ToDoSync work in VS Code browser (vscode.dev)?**
A: It should work, but hasn't been extensively tested. Report any issues!

**Q: Can multiple people use ToDoSync on the same Notion database?**
A: Yes! Each person needs their own API key, and they can all sync to the same database.

### Database Setup Questions

**Q: What properties are required in my Notion database?**
A: Minimum: Title property and Status property. Optional: Project (for centralized mode).

**Q: Can I rename properties after linking?**
A: Not recommended. The extension looks for "Status" by name. If you rename it, create a new link.

**Q: What status names should I use?**
A: Default: "Not started", "In progress", "Done". You can add custom statuses in Notion.

**Q: Can I have multiple Status properties?**
A: Notion only allows one Status property per database. ToDoSync uses that one.

**Q: What's the difference between Select and Relation for Project property?**
A: Relation (recommended) links to a separate Projects database. Select is a simple dropdown. Use Relation for flexibility.

---

## Advanced Features

### Import Tasks with Metadata

Create rich task imports with metadata tags:

```markdown
## Sprint 1
- [ ] Implement login @status:In progress @priority:High @due:2025-11-15
- [ ] Write tests @status:Not started @priority:Medium
- [x] Setup CI/CD @status:Done

## Sprint 2  
- [ ] Add dark mode @priority:Low
```

**Supported Tags:**
- `@status:StatusName` - Must match your Notion statuses exactly
- `@priority:PriorityValue` - If your DB has a Priority property
- `@due:YYYY-MM-DD` - If your DB has a Due Date property

**Tag Rules:**
- Tags are case-sensitive
- Multi-word statuses work: `@status:In progress`
- Tags must match your Notion property values exactly
- Unknown tags are ignored (no error)

### Managing Multiple Workspaces

You can link different workspaces to different databases or projects:

**Example:**
```
Workspace A: C:\Code\app1    → Database: "Work Tasks"   → Project: "App1"
Workspace B: C:\Code\app2    → Database: "Work Tasks"   → Project: "App2"
Workspace C: C:\Personal\blog → Database: "Personal"    → Project: None
```

**View All Linked Projects:**
1. Command Palette: `ToDoSync: View Tracked Projects`
2. See all workspace → database mappings
3. Quickly open in Notion or unlink

### Custom Status Options

ToDoSync automatically detects your Notion status options:

**In Notion:**
1. Open your database
2. Click the Status property
3. Click **Edit property**
4. Add/remove/rename statuses
5. Change colors

**In VS Code:**
- New statuses appear in the status picker immediately
- Color-coded emojis update automatically
- No configuration needed!

### Using .env for Teams

For team collaboration, use a shared `.env` file:

**1. Create `.env` in your workspace root:**
```env
NOTION_API_KEY=secret_yourteamintegrationkey
```

**2. Add to `.gitignore`:**
```
.env
```

**3. Share API key securely:**
- Use a team Notion integration
- Share the integration token via secure channel (1Password, etc.)
- Each team member adds it to their local `.env`

**Benefits:**
- Team uses same integration
- No per-user setup
- Consistent permissions

---

## Centralized Mode

### Overview

Centralized Mode = ONE Notion database for ALL your projects.

**How it works:**
1. Create a "Tasks Tracker" database in Notion
2. Add a Project property (Relation type)
3. Create a Projects database with all your project names
4. Link each VS Code workspace to Tasks Tracker, selecting its project
5. Each workspace sees only its own tasks

### Real-World Example

**Your Notion Setup:**
- **Tasks Tracker** database (500 tasks across all projects)
- **Projects** database: TodoSync, Portfolio, ClientWebsite, MobileApp

**Your VS Code Workspaces:**

```
C:\Code\todosync\         → Tasks Tracker → TodoSync      (24 tasks)
C:\Code\portfolio\        → Tasks Tracker → Portfolio     (12 tasks)
C:\Code\client-website\   → Tasks Tracker → ClientWebsite (45 tasks)
C:\Code\mobile-app\       → Tasks Tracker → MobileApp     (8 tasks)
```

**Benefits:**
- All 500 tasks in one Notion database
- Each workspace sees only its tasks
- Easy to switch contexts in Notion
- Unified task management

### Creating New Projects

When linking a workspace, you can create projects on-the-fly:

1. Select your centralized database
2. In the project dropdown, click **"$(add) Create new project"**
3. Enter project name
4. Done! The project is created in your Projects database automatically

### Best Practices for Centralized Mode

**DO:**
- ✅ Use descriptive project names (not "Project 1", "Project 2")
- ✅ Create projects before creating tasks (cleaner workflow)
- ✅ Use consistent naming (same in VS Code workspace and Notion)
- ✅ Archive old projects in Notion when done

**DON'T:**
- ❌ Delete projects that have tasks (orphans the tasks)
- ❌ Rename projects without updating VS Code workspace links
- ❌ Create multiple projects with similar names ("MyApp" and "My App")

---

## Keyboard Shortcuts

### Default Shortcuts

| Windows/Linux | Mac | Command |
|---------------|-----|---------|
| `Ctrl+Shift+T` | `Cmd+Shift+T` | Add new task |
| `F5` | `F5` | Sync now |

### Customizing Shortcuts

1. Open Keyboard Shortcuts: `Ctrl+K Ctrl+S`
2. Search for "ToDoSync"
3. Click the pencil icon next to a command
4. Press your desired key combination
5. Press Enter to save

**Conflicts:**
- `Ctrl+Shift+T` normally reopens closed tabs in VS Code
- If you need that, remap ToDoSync's shortcut

---

## Troubleshooting

### Performance Issues

**Problem:** Sync takes > 10 seconds

**Solutions:**
1. Check Notion's status page (status.notion.so)
2. Verify your internet speed
3. Try syncing a smaller database
4. Enable debug logging to see where time is spent

**Problem:** Import is very slow (> 2 sec per task)

**Solutions:**
1. Import in smaller batches (50 tasks at a time)
2. Check if you're hitting rate limits (rare)
3. Ensure stable internet connection

### Connection Errors

**Error:** "Request timed out. Check your internet connection"

**Solutions:**
1. Verify internet connectivity
2. Check firewall/VPN settings
3. Try accessing notion.so in your browser
4. Wait a moment and retry

**Error:** "Network error. Check your internet connection"

**Solutions:**
1. Check if you're online
2. Verify DNS is working
3. Try restarting VS Code
4. Check if Notion is down (status.notion.so)

### Permission Errors

**Error:** "Database not shared with integration"

**Solutions:**
1. Open database in Notion
2. Click Share → Invite → Select your integration
3. Verify integration appears in shared list
4. Run `ToDoSync: Sync Now`

**Error:** "Invalid Notion API key"

**Solutions:**
1. Verify API key starts with `secret_` or `ntn_`
2. Check for extra spaces when pasting
3. Regenerate key in Notion integration settings
4. Run `ToDoSync: Set Notion API Key` with new key

### Data Sync Issues

**Problem:** Created task in VS Code, not appearing in Notion

**Solutions:**
1. Wait 1-2 seconds (API delay)
2. Refresh Notion page
3. Check Output panel for errors
4. Verify database is shared with integration

**Problem:** Updated task in Notion, not showing in VS Code

**Solutions:**
1. Press `F5` to sync manually
2. Wait for auto-refresh (every 5 minutes)
3. Check if you're filtering to the right project
4. Restart VS Code

**Problem:** Tasks showing from other projects

**Solutions:**
1. Verify project filter is set correctly
2. Check `.vscode/settings.json` → `todoSync.trackedProjects`
3. Unlink and re-link the workspace
4. Make sure tasks in Notion have the Project relation set

### Import Issues

**Error:** "No tasks found in file"

**Solutions:**
1. Check file format: `- [ ] Task name`
2. Make sure checkboxes have spaces: `- [ ]` not `-[ ]`
3. Verify file encoding is UTF-8
4. Try opening the file in VS Code to check formatting

**Problem:** Tasks imported with wrong status

**Solutions:**
1. Check `@status:StatusName` tag spelling
2. Status name must match Notion exactly (case-sensitive)
3. Multi-word statuses: `@status:In progress` not `@status:Inprogress`
4. Leave off @status tag to use default ("Not started")

---

## Best Practices

### Workflow Optimization

**Morning Routine:**
1. Open VS Code
2. Auto-sync runs automatically
3. Scan your task list (19/24 tasks)
4. Pick a task, click to set "In progress"
5. Start coding!

**During Development:**
- Press `Ctrl+Shift+T` to quickly capture new tasks
- Click tasks to update status as you progress
- Tasks sync automatically - no manual saves

**End of Day:**
- Mark completed tasks as "Done"
- Add tomorrow's tasks
- Auto-sync saves everything to Notion

### Task Writing Tips

**Good Task Titles:**
- ✅ "Fix login redirect bug"
- ✅ "Add dark mode toggle"
- ✅ "Update API documentation"

**Bad Task Titles:**
- ❌ "Bug" (too vague)
- ❌ "Add feature to the thing for the users" (too wordy)
- ❌ "TODO" (not descriptive)

**Pro Tip:** Use Notion's description field for detailed notes. Keep the title short for VS Code readability.

### Project Structure

**Single Developer:**
- Centralized database recommended
- Easy to see all work in one place
- Filter by project in VS Code

**Team:**
- Centralized database with multiple Project relations
- Each team member filters to their projects
- Shared visibility in Notion

**Client Work:**
- Separate database per client
- Better isolation and security
- Easier to hand off when complete

### Maintenance

**Weekly:**
- Archive completed tasks (mark as "Done" or move to Archive status)
- Review "In progress" tasks - still active?
- Clean up duplicate or abandoned tasks

**Monthly:**
- Review project list - archive inactive projects
- Check for orphaned tasks (no project relation)
- Verify integration permissions are still correct

---

## Additional Resources

- **GitHub:** [https://github.com/shawnmcpeek/todosync](https://github.com/shawnmcpeek/todosync)
- **Issues:** [Report bugs or request features](https://github.com/shawnmcpeek/todosync/issues)
- **Notion API Docs:** [https://developers.notion.com](https://developers.notion.com)
- **Marketplace:** [Rate and review ToDoSync](https://marketplace.visualstudio.com/items?itemName=DaddooDev.todo-sync)

---

## Getting Help

**Found a bug?**
1. Enable debug logging
2. Reproduce the issue
3. Copy logs from Output panel
4. [Create an issue](https://github.com/shawnmcpeek/todosync/issues) with logs and steps to reproduce

**Have a feature request?**
1. Check [existing issues](https://github.com/shawnmcpeek/todosync/issues)
2. If not already requested, create a new issue
3. Describe the use case and why it would be valuable

**Need help setting up?**
1. Review this guide
2. Check the [NOTION_DATABASE_TEMPLATE.md](NOTION_DATABASE_TEMPLATE.md)
3. Still stuck? Create an issue with details

---

**Made with ❤️ by DaddooDev**

*Last updated: November 4, 2025*

