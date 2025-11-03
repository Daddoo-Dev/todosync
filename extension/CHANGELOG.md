# Changelog

All notable changes to the ToDoSync extension will be documented in this file.

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

