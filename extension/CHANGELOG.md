# Changelog

All notable changes to the ToDoSync extension will be documented in this file.

## [1.1.8] - 2025-11-15

### Added
- 🔘 **Quick action rows** (Add task, Sync now, Ask AI) rendered directly inside the ToDoSync tree for a polished VS Code layout

### Changed
- Toolbar buttons removed from the header; everything is now handled via inline info rows for consistency
- Guided onboarding copy tweaked for better progression messaging

## [1.1.7] - 2025-11-15

### Added
- 🧭 **Guided onboarding** inside the tree view with step-by-step info rows (open folder → add API key → connect workspace)
- ➕ **Toolbar icons** (Add Task `$(add)`, Sync `$(refresh)`, Ask AI `$(sparkle)`) for a consistent look in VS Code and Cursor

### Changed
- Empty states now render professional info rows instead of raw text/markdown
- Default version bumped to 1.1.7

## [1.1.6] - 2025-11-15

### Added
- ✨ **Ask AI sparkle button** on every task row to copy task context + mirror path straight to the clipboard
- ✨ **Toolbar + command palette action** (`ToDoSync: ✨ Ask AI (Copy Task Snapshot)`) with sparkle iconography

### Changed
- Updated README and User Guide with new Ask AI workflows
- Bumped extension manifest to 1.1.6 and refreshed VSIX packaging instructions

## [1.0.5] - 2025-11-08

### Added
- **Settings command** - Quick access to ToDoSync settings via Command Palette

## [1.0.4] - 2025-11-08

### Added
- All features from 1.0.3 (category grouping, hide completed, keyboard shortcuts, delete, error handling)

## [1.0.3] - 2025-11-08

### Added
- **Category grouping** - Tasks automatically organized into collapsible category sections
  - Reads Category property from Notion (Select type)
  - Shows completion count per category (5/10)
  - Import automatically assigns categories from `## Section Headers`
  - Collapse/expand categories to focus on what matters
- **Hide completed tasks** - Optional setting to hide "Done" tasks from tree view
  - Enable: `todoSync.hideCompletedTasks: true`
  - Keeps your view focused on active work
  - Completed tasks still count toward total in header
- **Keyboard shortcuts** - Ctrl+Shift+T for new task, F5 for sync
- **Delete task** - Right-click task to delete (archives in Notion)
- **Task count display** - Shows "X/Y tasks" (completed/total) in tree view header
- **Refresh button** - Manual sync button in tree view toolbar
- **Loading spinners** - Progress indicators for all async operations (sync, link, import)
- **Request timeouts** - 30-second timeout on all Notion API calls
- **Retry actions** - "Retry" button on all error notifications
- **Notion Database Template** - Complete setup guide for new users
- **Comprehensive User Guide** - Full documentation with FAQs, workflows, and best practices
- **Button separator** - Visual separation between toolbar buttons

### Improved
- **Error messages** - User-friendly messages for all error types:
  - "Invalid Notion API key" for auth errors
  - "Database not shared with integration" for permission errors  
  - "Request timed out. Check your internet connection" for timeouts
  - "Network error" for connectivity issues
  - "Notion API rate limit reached" for 429 errors
- **Task count** - Now shows completed vs total (19/24) instead of just total

### Fixed
- Database listing returning datasource IDs for multi-datasource databases
- License check failing with RLS policies

## [1.0.1] - 2025-11-03

### Added
- **Import Tasks from File** - Bulk import tasks from markdown files with checkbox format
- **Multi-datasource database support** - Full support for Notion's multi-datasource databases
- **Project dropdown** - Select from existing projects or create new ones when linking
- **Sync notifications** - Toast notifications for manual sync operations
- **Status change notifications** - Confirmation when updating task status
- **Refresh License Status** command - Manually check and display license tier
- **Debug logging with timestamps** - Detailed logging for troubleshooting
- **Freemium licensing system** - Stripe integration with Pro tier support

### Fixed
- Multi-datasource project dropdown not appearing
- Project relation not being set on new tasks
- Task filtering showing all projects instead of filtered project
- Windows CRLF line ending support in import parser
- Multi-word status parsing (e.g., "Not started", "In progress")
- Database listing showing datasource IDs instead of database IDs
- RLS policy blocking license reads
- .env file reading from incorrect path

### Performance
- Optimized bulk import speed from 7.5 sec/task to ~1 sec/task
- Cached database info to eliminate redundant API calls
- Pre-fetch project IDs for bulk operations

## [1.0.0] - 2025-11-01

### Initial Release
- Sync tasks between VS Code and Notion databases
- Centralized database mode with project filtering
- Status toggling with emoji indicators
- Auto-refresh every 5 minutes
- Tree view in Explorer sidebar
- Secure API key storage

