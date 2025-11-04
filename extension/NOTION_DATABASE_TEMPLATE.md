# ToDoSync Notion Database Template

This guide helps you create a Notion database that's optimized for ToDoSync.

## Quick Setup (Recommended)

### Option 1: Duplicate This Template
[Click here to duplicate the ToDoSync template database](https://shawnmcpeek.notion.site/TEMPLATE-LINK-HERE)

*Note: After duplicating, share the database with your Notion integration.*

### Option 2: Create From Scratch

Follow these steps to create a ToDoSync-ready database:

## Step-by-Step Setup

### 1. Create a New Database in Notion

1. Open Notion
2. Click **+ New page**
3. Select **Database** → **Table**
4. Name it "Tasks Tracker" (or whatever you prefer)

### 2. Configure Required Properties

Your database MUST have these two properties:

#### A. Task Name (Title Property)
- **Property Name:** "Task name" (or any name you prefer)
- **Type:** Title
- **Note:** Every database has one title property by default

#### B. Status Property
- Click **+ Add a property**
- **Property Name:** "Status"
- **Type:** Status
- Configure status options:
  - **Not started** (color: gray/default)
  - **In progress** (color: blue)
  - **Done** (color: green)
  - You can add more statuses if needed (e.g., "Blocked", "On hold")

### 3. Add Project Property (For Centralized Mode)

If you want to manage multiple projects in ONE database:

1. Click **+ Add a property**
2. **Property Name:** "Project"
3. **Type:** Relation
4. Click **+ Create a new database**
5. Name it "Projects"
6. Click **Create relation**

This creates a separate Projects database that you can link tasks to.

### 4. Populate the Projects Database

1. Open the **Projects** database (it's linked from your Tasks database)
2. Add your projects as rows:
   - TodoSync
   - MyApp
   - Website Redesign
   - (etc.)

### 5. Optional Properties (Recommended)

Add these for richer task management:

#### Priority
- **Type:** Select
- **Options:** Low, Medium, High, Critical

#### Due Date
- **Type:** Date

#### Description
- **Type:** Rich text

#### Assignee
- **Type:** Person

#### Tags
- **Type:** Multi-select
- **Options:** Bug, Feature, Documentation, etc.

#### Effort Level
- **Type:** Select
- **Options:** Small, Medium, Large

## 6. Share With Your Integration

**Critical Step:**

1. Click **Share** in the top right
2. Click **Invite**
3. Search for your integration name (e.g., "ToDoSync")
4. Click **Invite**
5. Confirm the integration now has access

## Example Database Structure

Here's what your final database should look like:

| Task name | Status | Project | Priority | Due Date | Description |
|-----------|--------|---------|----------|----------|-------------|
| Fix login bug | In progress | TodoSync | High | 2025-11-10 | Users can't log in with OAuth |
| Design landing page | Not started | Website | Medium | 2025-11-15 | Create mockups in Figma |
| Write API docs | Done | MyApp | Low | 2025-11-05 | Document REST endpoints |

## Using With ToDoSync

Once your database is set up:

1. In VS Code: `Ctrl+Shift+P`
2. Run: `ToDoSync: Link Project`
3. Select your database
4. Select a project (e.g., "TodoSync")
5. Your tasks will appear in the VS Code sidebar!

## Tips for Best Results

### ✅ Do This
- Use consistent project names (exact match matters)
- Keep status names simple ("Not started" not "🔴 Not started")
- Share database with your integration BEFORE linking
- Use the Projects relation for centralized mode

### ❌ Avoid This
- Don't use Multi-select for Project (use Relation instead)
- Don't rename properties after linking (extension won't find them)
- Don't delete the Status or Title properties
- Don't create duplicate project names

## Troubleshooting

**ToDoSync shows "No project property found"**
- Make sure Project property is type "Relation", not "Select" or "Multi-select"
- The property name must contain "Project"

**Tasks not showing up**
- Check that tasks have the correct Project relation set
- Verify database is shared with your integration
- Run `ToDoSync: Sync Now` to refresh

**Can't select a project when linking**
- Your Projects database is empty - add at least one project
- Make sure the Project relation is created correctly

## Advanced: Multi-Datasource Databases

Notion's new multi-datasource databases are fully supported by ToDoSync!

**What they are:**
- One database that can pull from multiple data sources
- More flexible than traditional databases
- Automatically detected by ToDoSync

**How to use:**
- Create your database normally
- ToDoSync will detect if it's multi-datasource
- Everything works the same way

## Need Help?

- [Report an issue](https://github.com/shawnmcpeek/todosync/issues)
- [View documentation](https://github.com/shawnmcpeek/todosync)
- Check the troubleshooting section in the main README

