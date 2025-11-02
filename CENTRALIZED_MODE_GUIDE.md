# ToDoSync Centralized Database Mode

## What Changed

### Issue #1: Database Pagination (FIXED)
Previously, the extension only showed the first page of Notion databases (up to 100). Now it fetches ALL your databases using pagination, so you'll see every database you have access to.

### Issue #2: Centralized Architecture (IMPLEMENTED)
You can now use ONE central Notion database (like your "Tasks Tracker") for ALL your VS Code projects, instead of having separate databases per project.

## How It Works

### Setup Your Centralized Database

1. **In Notion**: Add a "Project" property to your database
   - Type: `Select` 
   - Add options for each of your projects (e.g., "Knights Management", "Ridewealth Assistant", "Oracular", etc.)

2. **In VS Code**: Link each workspace to the centralized database
   - Run: `ToDoSync: Link Project`
   - Select your centralized database (e.g., "Tasks Tracker")
   - **New**: You'll be prompted to select a project from the dropdown or create a new one
   - The extension will filter tasks to show only items matching your selected project

### Linking Multiple Projects

Each VS Code workspace can link to the same centralized database with different project filters:

```
Project A (VS Code) → Tasks Tracker DB → Project Filter: "Knights Management"
Project B (VS Code) → Tasks Tracker DB → Project Filter: "Ridewealth Assistant"
Project C (VS Code) → Tasks Tracker DB → Project Filter: "Oracular"
```

### Freemium Model

**Free Tier**: 
- 1 project (whether it's a separate database OR a filtered project in a centralized database)
- Each unique database + project combination counts as 1 project

**Pro Tier**: 
- Unlimited projects
- Unlimited databases
- Can mix centralized + separate databases

**Examples:**
- Free: Tasks Tracker DB → "Knights Management" ✅ (1 project)
- Free: Tasks Tracker DB → "Ridewealth Assistant" ❌ (would need Pro - 2nd project)
- Free: Different Database → "Any Project" ❌ (would need Pro - 2nd project)
- Pro: Tasks Tracker DB → 10 different projects ✅ (unlimited)
- Pro: 5 different databases with multiple projects each ✅ (unlimited)

## Benefits of Centralized Mode

1. **Single Source of Truth**: All tasks in one place
2. **Cross-Project Visibility**: Easy to see all tasks across projects in Notion
3. **Simplified Management**: Update project options once, use everywhere
4. **Organized Structure**: Keep related projects together in one database

## Legacy Mode (No Project Property)

If your database doesn't have a "Project" property, the extension works as before:
- Each workspace syncs ALL tasks from the linked database
- No filtering applied
- Good for simple, single-project databases

## Migration Guide

### From Separate Databases → Centralized

1. Create a new "Tasks Tracker" database in Notion
2. Add "Project" select property with your project names
3. Copy/move tasks from old databases, setting the Project property
4. Re-link each VS Code workspace to the centralized database
5. Select the appropriate project filter for each workspace

### Example Project Setup

Your Notion "Tasks Tracker" database should have:
- **Title** property (for task name)
- **Status** property (for task status)
- **Project** property (Select type) with options:
  - Knights Management
  - Ridewealth Assistant
  - Oracular
  - Scythe & Seek
  - Hand of Death
  - BulkMailing
  - Abductonomics
  - (etc.)

## Testing

To verify it's working:
1. Link a workspace to your centralized database
2. Select a project filter
3. Add a task - it should automatically set the Project property
4. Check Notion - the task should appear with the correct project
5. Open another workspace linked to a different project - you should only see tasks for that project

## Troubleshooting

**Not seeing project options?**
- Make sure your Notion database has a "Project" property
- Property must be type "Select" (not Multi-select or Text)
- Property must be named exactly "Project"

**Seeing all tasks instead of filtered?**
- Check that tasks have the Project property set in Notion
- Verify the property name is exactly "Project"
- Try re-linking the workspace

**Free tier warning?**
- Free tier is limited to 1 project configuration
- Each unique database + project combination counts as a separate project
- To use multiple projects, upgrade to Pro

