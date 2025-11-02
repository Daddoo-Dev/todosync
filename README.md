# ToDoSync

VS Code/Cursor extension to sync tasks directly with Notion databases (no local `to-do.md`).

## Installation

1. Install the extension: `cursor --install-extension todo-sync-1.0.0.vsix`
2. Restart Cursor

## Setup

1. Set your Notion API key:
   - Go to: `View` → `Command Palette` (or `Ctrl+Shift+P`)
   - Type: `Preferences: Open Settings (JSON)`
   - Add:
     ```json
     {
       "todoSync.notionApiKey": "your-api-key-here"
     }
     ```

## Usage

To link a project:

1. Open your project folder in Cursor
2. Press `Ctrl+Shift+P` (or `View` → `Command Palette`)
3. Type: `ToDoSync: Link Project`
4. Enter a project name
5. Select the Notion database to link
6. The extension links your project to a Notion database; all actions are synced directly with Notion.

To sync:
- Press `Ctrl+Shift+P`
- Type: `ToDoSync: Sync Now` (refreshes from Notion)
- Or: `ToDoSync: Sync All Projects`

## Notion Database Setup

### Basic Mode
Each database must have:
- A title property (for the task text)
- A status property (for task status)

### Centralized Mode (Recommended)
Use ONE database for all projects:
- A title property (for the task text)
- A status property (for task status)
- A **Project** property (Select type) with your project names

When linking, you'll select which project to filter tasks by. This allows all your VS Code workspaces to share one centralized task database!

See `CENTRALIZED_MODE_GUIDE.md` for detailed setup instructions.