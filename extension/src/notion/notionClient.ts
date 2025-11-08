import { Client } from '@notionhq/client';

export type NotionTask = {
  id: string;
  title: string;
  status: 'Not started' | 'In progress' | 'Done' | string;
  category?: string;
  lastEditedTime?: string;
};

export type StatusOption = {
  name: string;
  color: string;
};

const NOTION_COLOR_TO_EMOJI: Record<string, string> = {
  default: '⚪',
  gray: '⚪',
  brown: '🟤',
  orange: '🟠',
  yellow: '🟡',
  green: '🟢',
  blue: '🔵',
  purple: '🟣',
  pink: '🩷',
  red: '🔴',
};

function notionColorToEmoji(color: string): string {
  return NOTION_COLOR_TO_EMOJI[color.toLowerCase()] || NOTION_COLOR_TO_EMOJI.default;
}

export class NotionClientWrapper {
  private client: Client;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor(apiKey: string) {
    this.client = new Client({ 
      auth: apiKey,
      notionVersion: '2025-09-03'  // Supports multi-datasource databases
    });
  }

  private async withTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
    const timeout = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${this.REQUEST_TIMEOUT / 1000}s: ${operation}`)), this.REQUEST_TIMEOUT);
    });
    
    try {
      return await Promise.race([promise, timeout]);
    } catch (error: any) {
      // Enhance error messages
      if (error.code === 'unauthorized') {
        throw new Error('Invalid Notion API key. Please check your API key.');
      } else if (error.code === 'restricted_resource') {
        throw new Error('Database not shared with integration. Share it in Notion settings.');
      } else if (error.code === 'object_not_found') {
        throw new Error('Database or page not found. It may have been deleted.');
      } else if (error.code === 'rate_limited') {
        throw new Error('Notion API rate limit reached. Please wait a moment and try again.');
      } else if (error.message?.includes('timed out')) {
        throw new Error('Request timed out. Check your internet connection.');
      } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('network')) {
        throw new Error('Network error. Check your internet connection.');
      }
      throw error;
    }
  }

  async listDatabases(): Promise<{ id: string; title: string }[]> {
    const databases: { id: string; title: string }[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined = undefined;
    
    // Search for datasources (this includes both standalone databases and multi-datasource DBs)
    do {
      const res: any = await this.withTimeout(
        this.client.search({
          filter: { property: 'object', value: 'data_source' },
          sort: { direction: 'ascending', timestamp: 'last_edited_time' },
          start_cursor: cursor,
          page_size: 100
        } as any),
        'list databases'
      );
      
      for (const r of res.results as any[]) {
        // For multi-datasource databases, the parent is a database
        // We want to show the parent database, not the individual datasources
        if (r.parent?.type === 'database_id') {
          const dbId = r.parent.database_id;
          if (!seen.has(dbId)) {
            seen.add(dbId);
            // Fetch the actual database to get its title
            try {
              const db = await this.client.databases.retrieve({ database_id: dbId });
              databases.push({
                id: dbId,
                title: (db as any).title?.[0]?.plain_text || 'Untitled'
              });
            } catch (e) {
              // Skip if can't retrieve
            }
          }
        } else {
          // Standalone database (datasource is the database)
          databases.push({
            id: r.id,
            title: r.title?.[0]?.plain_text || 'Untitled'
          });
        }
      }
      
      cursor = (res as any).next_cursor || undefined;
      if (!(res as any).has_more) cursor = undefined;
    } while (cursor);
    
    return databases;
  }

  async getTasks(databaseId: string, pageSize = 200, projectFilter?: string): Promise<NotionTask[]> {
    const tasks: NotionTask[] = [];
    
    // Multi-datasource databases can't be queried directly, need to use search
    const db = await this.withTimeout(
      this.client.databases.retrieve({ database_id: databaseId }),
      'retrieve database'
    );
    const isMultiDatasource = (db as any).data_sources && (db as any).data_sources.length > 0;
    
    if (isMultiDatasource) {
      // Use search API for multi-datasource databases
      let cursor: string | undefined = undefined;
      let projectRelationId: string | undefined = undefined;
      
      // Get the datasource IDs for THIS database only
      const datasourceIds = new Set((db as any).data_sources?.map((ds: any) => ds.id) || []);
      console.log(`[DEBUG] This database has ${datasourceIds.size} datasource(s)`);
      
      // If filtering by project name, first find the project ID
      if (projectFilter) {
        const projectOptions = await this.getProjectOptionsWithIds(databaseId);
        const project = projectOptions.find(p => p.name === projectFilter);
        projectRelationId = project?.id;
        console.log(`[DEBUG] Filtering by project: "${projectFilter}", ID: ${projectRelationId}`);
      }
      
      do {
        const searchResults = await this.client.search({
          filter: { property: 'object', value: 'page' },
          page_size: pageSize,
          start_cursor: cursor
        } as any);
        
        for (const r of searchResults.results as any[]) {
          // Only include pages from THIS database's datasources
          const parentDatasourceId = r.parent?.data_source_id;
          if (r.parent?.type === 'data_source_id' && datasourceIds.has(parentDatasourceId)) {
            // Check project filter if specified
            if (projectRelationId) {
              const projProp = r.properties?.['Project (Relation)'] || r.properties?.Project;
              if (projProp?.type === 'relation') {
                const relations = projProp.relation || [];
                const hasProject = relations.some((rel: any) => rel.id === projectRelationId);
                console.log(`[DEBUG] Page: ${r.id}, Has matching project: ${hasProject}, Relations: ${relations.map((rel: any) => rel.id).join(', ')}`);
                if (!hasProject) continue;
              } else {
                console.log(`[DEBUG] Page: ${r.id}, No relation property, skipping`);
                continue; // Skip if no relation property
              }
            }
            
            const titleProp = Object.values(r.properties).find((p: any) => p.type === 'title') as any;
            const statusProp = (r.properties['Status'] as any);
            const categoryProp = (r.properties['Category'] as any);
            const title = (titleProp?.title?.[0]?.plain_text) || 'Untitled';
            const status = statusProp?.status?.name || 'Not started';
            const category = categoryProp?.select?.name;
            tasks.push({ id: r.id, title, status, category, lastEditedTime: r.last_edited_time });
          }
        }
        
        cursor = (searchResults as any).next_cursor || undefined;
        if (!(searchResults as any).has_more) cursor = undefined;
      } while (cursor);
    } else {
      // Use standard query for regular databases
      let cursor: string | undefined = undefined;
      do {
        const queryOptions: any = {
          database_id: databaseId,
          start_cursor: cursor,
          page_size: pageSize,
          sorts: [
            { property: 'Status', direction: 'ascending' },
            { timestamp: 'last_edited_time', direction: 'descending' }
          ]
        };

        // Add project filter if specified
        if (projectFilter) {
          const projectProp = (db as any).properties?.['Project (Relation)'] || (db as any).properties?.Project;
          if (projectProp?.type === 'select') {
            queryOptions.filter = {
              property: projectProp.name || 'Project',
              select: { equals: projectFilter }
            };
          }
        }

        const page = await this.client.databases.query(queryOptions);
        for (const r of page.results as any[]) {
          const titleProp = Object.values(r.properties).find((p: any) => p.type === 'title') as any;
          const statusProp = (r.properties['Status'] as any);
          const categoryProp = (r.properties['Category'] as any);
          const title = (titleProp?.title?.[0]?.plain_text) || 'Untitled';
          const status = statusProp?.status?.name || 'Not started';
          const category = categoryProp?.select?.name;
          tasks.push({ id: r.id, title, status, category, lastEditedTime: r.last_edited_time });
        }
        cursor = (page as any).next_cursor || undefined;
        if (!(page as any).has_more) cursor = undefined;
      } while (cursor);
    }
    
    return tasks;
  }
  
  async getProjectOptionsWithIds(databaseId: string): Promise<{ id: string; name: string }[]> {
    try {
      const db = await this.client.databases.retrieve({ database_id: databaseId });
      const projectProp = (db as any).properties?.['Project (Relation)'] || (db as any).properties?.Project;
      const isMultiDatasource = (db as any).data_sources && (db as any).data_sources.length > 0;
      
      console.log(`[DEBUG getProjectOptionsWithIds] projectProp type: ${projectProp?.type}, isMultiDatasource: ${isMultiDatasource}`);
      
      if (!projectProp && !isMultiDatasource) {
        console.log(`[DEBUG getProjectOptionsWithIds] No project prop and not multi-datasource, returning []`);
        return [];
      }
      
      if (projectProp && projectProp.type !== 'relation' && !isMultiDatasource) {
        console.log(`[DEBUG getProjectOptionsWithIds] Project prop is not relation and not multi-datasource, returning []`);
        return [];
      }
      
      const projectIds = new Set<string>();
      let cursor: string | undefined = undefined;
      
      do {
        const searchResults = await this.client.search({
          filter: { property: 'object', value: 'page' },
          page_size: 100,
          start_cursor: cursor
        } as any);
        
        for (const page of searchResults.results as any[]) {
          if (page.parent?.type === 'data_source_id' || page.parent?.type === 'database_id') {
            const pageProp = page.properties?.['Project (Relation)'] || page.properties?.Project;
            if (pageProp && pageProp.type === 'relation') {
              const relations = pageProp.relation || [];
              relations.forEach((rel: any) => projectIds.add(rel.id));
            }
          }
        }
        
        cursor = (searchResults as any).next_cursor || undefined;
        if (!(searchResults as any).has_more) cursor = undefined;
      } while (cursor);
      
      console.log(`[DEBUG getProjectOptionsWithIds] Found ${projectIds.size} unique project IDs`);
      
      const projects: { id: string; name: string }[] = [];
      for (const projectId of projectIds) {
        try {
          const projectPage = await this.client.pages.retrieve({ page_id: projectId });
          const props = (projectPage as any).properties || {};
          
          for (const prop of Object.values(props)) {
            if ((prop as any).type === 'title') {
              const titleItems = (prop as any).title || [];
              if (titleItems.length > 0) {
                const name = titleItems[0].plain_text || 'Untitled';
                projects.push({ id: projectId, name });
                console.log(`[DEBUG getProjectOptionsWithIds] Found project: ${name} (${projectId})`);
                break;
              }
            }
          }
        } catch (error) {
          // Skip
        }
      }
      
      return projects;
    } catch (error) {
      console.log(`[DEBUG getProjectOptionsWithIds] Error: ${error}`);
      return [];
    }
  }

  async getStatusOptions(databaseId: string): Promise<StatusOption[]> {
    const db = await this.client.databases.retrieve({ database_id: databaseId });
    const statusProp = (db as any).properties?.Status;
    if (!statusProp || statusProp.type !== 'status') {
      return [
        { name: 'Not started', color: 'gray' },
        { name: 'In progress', color: 'blue' },
        { name: 'Done', color: 'green' }
      ];
    }
    return (statusProp.status?.options || []).map((opt: any) => ({
      name: opt.name,
      color: opt.color || 'default'
    }));
  }

  async getProjectOptions(databaseId: string): Promise<string[]> {
    try {
      const db = await this.client.databases.retrieve({ database_id: databaseId });
      const projectProp = (db as any).properties?.['Project (Relation)'] || (db as any).properties?.Project;
      const isMultiDatasource = (db as any).data_sources && (db as any).data_sources.length > 0;
      
      // Handle old select-based projects
      if (projectProp && projectProp.type === 'select') {
        return (projectProp.select?.options || []).map((opt: any) => opt.name);
      }
      
      // Handle new relation-based projects or multi-datasource databases
      if ((projectProp && projectProp.type === 'relation') || isMultiDatasource) {
        // Search for all pages to find unique project relations
        const projectIds = new Set<string>();
        let cursor: string | undefined = undefined;
        
        do {
          const searchResults = await this.client.search({
            filter: { property: 'object', value: 'page' },
            page_size: 100,
            start_cursor: cursor
          } as any);
          
          for (const page of searchResults.results as any[]) {
            // Check if this page belongs to our database
            if (page.parent?.type === 'data_source_id' || page.parent?.type === 'database_id') {
              const pageProp = page.properties?.['Project (Relation)'] || page.properties?.Project;
              if (pageProp && pageProp.type === 'relation') {
                const relations = pageProp.relation || [];
                relations.forEach((rel: any) => projectIds.add(rel.id));
              }
            }
          }
          
          cursor = (searchResults as any).next_cursor || undefined;
          if (!(searchResults as any).has_more) cursor = undefined;
        } while (cursor);
        
        // Fetch project names
        const projectNames: string[] = [];
        for (const projectId of projectIds) {
          try {
            const projectPage = await this.client.pages.retrieve({ page_id: projectId });
            const props = (projectPage as any).properties || {};
            
            // Find the title property
            for (const prop of Object.values(props)) {
              if ((prop as any).type === 'title') {
                const titleItems = (prop as any).title || [];
                if (titleItems.length > 0) {
                  projectNames.push(titleItems[0].plain_text || 'Untitled');
                  break;
                }
              }
            }
          } catch (error) {
            // Skip if we can't fetch this project
          }
        }
        
        return projectNames.sort();
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  async getDatabaseInfo(databaseId: string): Promise<{ 
    isMultiDatasource: boolean; 
    datasourceId?: string;
    titlePropertyName: string;
  }> {
    const db = await this.client.databases.retrieve({ database_id: databaseId });
    const isMultiDatasource = (db as any).data_sources && (db as any).data_sources.length > 0;
    
    let titlePropertyName = 'Task name'; // Default for multi-datasource
    if (!isMultiDatasource) {
      const titleProp = Object.entries((db as any).properties || {}).find(([_, p]: [string, any]) => p.type === 'title');
      if (titleProp) {
        titlePropertyName = titleProp[0];
      }
    }
    
    const datasourceId = isMultiDatasource && (db as any).data_sources?.length > 0 
      ? (db as any).data_sources[0].id 
      : undefined;
    
    return { 
      isMultiDatasource,
      datasourceId,
      titlePropertyName
    };
  }

  async hasProjectProperty(databaseId: string): Promise<boolean> {
    try {
      let db: any;
      try {
        db = await this.client.databases.retrieve({ database_id: databaseId });
      } catch (dbError: any) {
        // If we can't retrieve the database, assume no project property
        console.log(`[DEBUG hasProjectProperty] Failed to retrieve database: ${dbError.code}`);
        if (dbError.code === 'object_not_found') {
          return false;
        }
        throw dbError;
      }
      
      // Check if database has properties directly (regular database)
      const projectProp = (db as any).properties?.['Project (Relation)'] || (db as any).properties?.Project;
      console.log(`[DEBUG hasProjectProperty] Direct property check - found: ${!!projectProp}, type: ${projectProp?.type}`);
      if (projectProp && (projectProp.type === 'select' || projectProp.type === 'relation')) {
        return true;
      }
      
      // For multi-datasource databases, check sample pages from the data sources
      const isMultiDatasource = (db as any).data_sources && (db as any).data_sources.length > 0;
      console.log(`[DEBUG hasProjectProperty] Is multi-datasource: ${isMultiDatasource}`);
      if (isMultiDatasource) {
        const dataSources = (db as any).data_sources || [];
        
        // Search pages from each data source
        for (const dataSource of dataSources) {
          const searchResults = await this.client.search({
            filter: { property: 'object', value: 'page' },
            page_size: 10
          } as any);
          
          // Look for pages that belong to any data source in this multi-datasource db
          for (const result of searchResults.results as any[]) {
            if (result.parent?.type === 'data_source_id') {
              const pageProp = result.properties?.['Project (Relation)'] || result.properties?.Project;
              console.log(`[DEBUG hasProjectProperty] Found page with data_source_id, Project prop type: ${pageProp?.type}`);
              if (pageProp && (pageProp.type === 'select' || pageProp.type === 'relation')) {
                console.log(`[DEBUG hasProjectProperty] ✓ Found Project property!`);
                return true;
              }
            }
          }
        }
      }
      
      console.log(`[DEBUG hasProjectProperty] ✗ No project property found`);
      return false;
    } catch (error) {
      console.log(`[DEBUG hasProjectProperty] Error: ${error}`);
      return false;
    }
  }

  getStatusEmoji(statusName: string, statusOptions?: StatusOption[]): string {
    if (statusOptions) {
      const option = statusOptions.find(opt => opt.name === statusName);
      if (option) {
        return notionColorToEmoji(option.color);
      }
    }
    const fallback: Record<string, string> = {
      'Not started': '⚪',
      'In progress': '🔵',
      'Done': '🟢'
    };
    return fallback[statusName] || '⚪';
  }

  async updateStatus(pageId: string, status: string): Promise<void> {
    await this.withTimeout(
      this.client.pages.update({
        page_id: pageId,
        properties: {
          Status: { status: { name: status } }
        } as any
      }),
      'update status'
    );
  }

  async deleteTask(pageId: string): Promise<void> {
    await this.withTimeout(
      this.client.pages.update({
        page_id: pageId,
        archived: true
      }),
      'delete task'
    );
  }

  async createTask(
    databaseId: string, 
    title: string, 
    defaultStatus?: string, 
    projectName?: string, 
    projectId?: string,
    cachedDbInfo?: { isMultiDatasource: boolean; datasourceId?: string; titlePropertyName: string },
    category?: string
  ): Promise<string> {
    // Use cached database info if provided, otherwise fetch it
    let dbInfo = cachedDbInfo;
    if (!dbInfo) {
      dbInfo = await this.getDatabaseInfo(databaseId);
    }
    
    const { isMultiDatasource, datasourceId, titlePropertyName } = dbInfo;
    const properties: any = {};
    
    // Set title
    properties[titlePropertyName] = {
      title: [{ text: { content: title } }]
    };
    
    // Set status if provided
    if (defaultStatus) {
      // For multi-datasource, Status property always exists
      // For regular databases, we assume it exists if a default status is provided
      properties.Status = { status: { name: defaultStatus } };
    }
    
    // Set project if provided
    if (projectName || projectId) {
      if (isMultiDatasource) {
        // Multi-datasource always uses relation-based projects
        let projId = projectId;
        
        // Only look up project ID if not provided (expensive operation)
        if (!projId && projectName) {
          const projects = await this.getProjectOptionsWithIds(databaseId);
          const project = projects.find(p => p.name === projectName);
          projId = project?.id;
        }
        
        if (projId) {
          properties['Project (Relation)'] = {
            relation: [{ id: projId }]
          };
        }
      } else {
        // Regular database - need to fetch database to check property type
        const db = await this.client.databases.retrieve({ database_id: databaseId });
        const projectProp = (db as any).properties?.['Project (Relation)'] || (db as any).properties?.Project;
        
        if (projectProp?.type === 'select') {
          properties[projectProp.name || 'Project'] = { select: { name: projectName } };
        } else if (projectProp?.type === 'relation') {
          const projects = await this.getProjectOptionsWithIds(databaseId);
          const project = projects.find(p => p.name === projectName);
          
          if (project) {
            properties[projectProp.name || 'Project (Relation)'] = {
              relation: [{ id: project.id }]
            };
          }
        }
      }
    }
    
    // Set category if provided
    if (category) {
      properties.Category = { select: { name: category } };
    }
    
    // For multi-datasource databases, use the datasource as parent
    let parent: any = { database_id: databaseId };
    if (isMultiDatasource && datasourceId) {
      parent = { type: 'data_source_id', data_source_id: datasourceId };
    }
    
    const page = await this.withTimeout(
      this.client.pages.create({
        parent: parent,
        properties
      }),
      'create task'
    );
    
    return page.id;
  }
}


