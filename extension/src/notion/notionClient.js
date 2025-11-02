"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionClientWrapper = void 0;
const client_1 = require("@notionhq/client");
const NOTION_COLOR_TO_EMOJI = {
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
function notionColorToEmoji(color) {
    return NOTION_COLOR_TO_EMOJI[color.toLowerCase()] || NOTION_COLOR_TO_EMOJI.default;
}
class NotionClientWrapper {
    constructor(apiKey) {
        this.client = new client_1.Client({
            auth: apiKey,
            notionVersion: '2025-09-03' // Supports multi-datasource databases
        });
    }
    async listDatabases() {
        const databases = [];
        let cursor = undefined;
        let pageCount = 0;
        do {
            pageCount++;
            const res = await this.client.search({
                filter: { property: 'object', value: 'data_source' },
                sort: { direction: 'ascending', timestamp: 'last_edited_time' },
                start_cursor: cursor,
                page_size: 100
            });
            databases.push(...res.results.map((r) => ({
                id: r.id,
                title: r.title?.[0]?.plain_text || 'Untitled'
            })));
            cursor = res.next_cursor || undefined;
            if (!res.has_more)
                cursor = undefined;
        } while (cursor);
        return databases;
    }
    async getTasks(databaseId, pageSize = 200, projectFilter) {
        const tasks = [];
        let cursor = undefined;
        do {
            const queryOptions = {
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
                queryOptions.filter = {
                    property: 'Project',
                    select: { equals: projectFilter }
                };
            }
            const page = await this.client.databases.query(queryOptions);
            for (const r of page.results) {
                const titleProp = Object.values(r.properties).find((p) => p.type === 'title');
                const statusProp = r.properties['Status'];
                const title = (titleProp?.title?.[0]?.plain_text) || 'Untitled';
                const status = statusProp?.status?.name || 'Not started';
                tasks.push({ id: r.id, title, status, lastEditedTime: r.last_edited_time });
            }
            cursor = page.next_cursor || undefined;
            if (!page.has_more)
                cursor = undefined;
        } while (cursor);
        return tasks;
    }
    async getStatusOptions(databaseId) {
        const db = await this.client.databases.retrieve({ database_id: databaseId });
        const statusProp = db.properties?.Status;
        if (!statusProp || statusProp.type !== 'status') {
            return [
                { name: 'Not started', color: 'gray' },
                { name: 'In progress', color: 'blue' },
                { name: 'Done', color: 'green' }
            ];
        }
        return (statusProp.status?.options || []).map((opt) => ({
            name: opt.name,
            color: opt.color || 'default'
        }));
    }
    async getProjectOptions(databaseId) {
        try {
            const db = await this.client.databases.retrieve({ database_id: databaseId });
            const projectProp = db.properties?.Project;
            if (!projectProp || projectProp.type !== 'select') {
                return [];
            }
            return (projectProp.select?.options || []).map((opt) => opt.name);
        }
        catch (error) {
            return [];
        }
    }
    async hasProjectProperty(databaseId) {
        try {
            const db = await this.client.databases.retrieve({ database_id: databaseId });
            const projectProp = db.properties?.Project;
            return projectProp && projectProp.type === 'select';
        }
        catch (error) {
            return false;
        }
    }
    getStatusEmoji(statusName, statusOptions) {
        if (statusOptions) {
            const option = statusOptions.find(opt => opt.name === statusName);
            if (option) {
                return notionColorToEmoji(option.color);
            }
        }
        const fallback = {
            'Not started': '⚪',
            'In progress': '🔵',
            'Done': '🟢'
        };
        return fallback[statusName] || '⚪';
    }
    async updateStatus(pageId, status) {
        await this.client.pages.update({
            page_id: pageId,
            properties: {
                Status: { status: { name: status } }
            }
        });
    }
    async createTask(databaseId, title, defaultStatus, projectName) {
        const db = await this.client.databases.retrieve({ database_id: databaseId });
        const properties = {};
        // Find title property
        const titleProp = Object.entries(db.properties || {}).find(([_, p]) => p.type === 'title');
        if (titleProp) {
            properties[titleProp[0]] = {
                title: [{ text: { content: title } }]
            };
        }
        // Set status if provided
        if (defaultStatus && db.properties?.Status) {
            properties.Status = { status: { name: defaultStatus } };
        }
        // Set project if provided
        if (projectName && db.properties?.Project) {
            properties.Project = { select: { name: projectName } };
        }
        const page = await this.client.pages.create({
            parent: { database_id: databaseId },
            properties
        });
        return page.id;
    }
}
exports.NotionClientWrapper = NotionClientWrapper;
//# sourceMappingURL=notionClient.js.map