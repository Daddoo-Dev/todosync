# Task Import Template for ToDoSync

Use this template to bulk import tasks into your Notion database via ToDoSync.

## Format Rules
- Use standard markdown checkboxes: `- [ ]` or `- [x]`
- **Section headers** (`## Category Name`) automatically assign categories to tasks below them
- Each checkbox creates one task
- You can add metadata after the task title using tags:
  - `@status:StatusName` - Set specific status (e.g., @status:In progress)
  - `@category:CategoryName` - Override section header category
  - `@priority:PriorityName` - Set priority if your DB has priority property
  - `@due:YYYY-MM-DD` - Set due date if your DB has due date property
  
## Example Tasks

## UI/UX Improvements
- [ ] Add loading indicators during sync @status:Not started
- [ ] Display last sync time in header
- [ ] Implement search/filter bar in tree view @priority:High

## Core Features
- [ ] Add task deletion capability @status:In progress
- [ ] Support due dates from Notion @due:2025-11-10
- [x] Fix multi-datasource project dropdown @status:Done

## Documentation
- [ ] Create comprehensive user guide
- [ ] Write FAQ section
- [ ] Create video tutorial

## Notes
- Lines starting with `##` are treated as category headers (not imported as tasks)
- Lines without checkboxes are ignored
- Checked boxes `[x]` will be imported with "Done" status (unless @status specified)
- Unchecked boxes `[ ]` will use the database's default status
- Unknown @status values will fall back to default
- If your database doesn't have a property, that metadata is ignored

