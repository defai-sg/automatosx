/**
 * Project Memory System
 * Manages project context, history, and intelligent retrieval
 */

import fs from 'fs-extra';
import path from 'path';
import { getMilvusInstance } from '../memory/milvus-embedded.js';

export class ProjectMemory {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.memoryPath = path.join(projectPath, '.defai/memory');
        this.contextFile = path.join(this.memoryPath, 'context.json');
        this.vectorDB = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            await fs.ensureDir(this.memoryPath);
            this.vectorDB = await getMilvusInstance(this.projectPath);
            this.initialized = true;
        } catch (error) {
            console.warn('Vector DB initialization failed, falling back to file-based memory:', error.message);
            // Continue with file-based fallback
            this.initialized = true;
        }
    }

    async saveContext(role, task, result, metadata = {}) {
        await this.initialize();

        const context = {
            id: this.generateId(),
            role: role,
            task: task,
            result: result,
            timestamp: new Date().toISOString(),
            metadata: metadata
        };

        try {
            // Try to save to vector database
            await this.vectorDB.storeMemory(
                context.id,
                task,
                result,
                {
                    role: role,
                    timestamp: context.timestamp,
                    ...metadata
                }
            );
        } catch (error) {
            console.warn('Vector DB storage failed, using file fallback:', error.message);
        }

        // Always save to file as backup
        await this.saveToFile(context);

        return context.id;
    }

    async retrieveContext(query, role = null, limit = 5) {
        await this.initialize();

        try {
            // Try vector search first
            const vectorResults = await this.vectorDB.searchMemory(query, { role }, limit);
            if (vectorResults && vectorResults.length > 0) {
                return vectorResults;
            }
        } catch (error) {
            console.warn('Vector search failed, using file fallback:', error.message);
        }

        // Fallback to file-based search
        return await this.searchFiles(query, role, limit);
    }

    async getProjectContext() {
        const context = {
            projectPath: this.projectPath,
            projectName: path.basename(this.projectPath),
            framework: await this.detectFramework(),
            language: await this.detectLanguage(),
            recentTasks: await this.getRecentTasks(10)
        };

        return context;
    }

    async saveToFile(context) {
        const historyFile = path.join(this.memoryPath, 'history.jsonl');
        await fs.appendFile(historyFile, JSON.stringify(context) + '\n');

        // Update context summary
        const existingContext = await this.loadContextFile();
        existingContext.lastUpdated = new Date().toISOString();
        existingContext.totalTasks = (existingContext.totalTasks || 0) + 1;

        if (!existingContext.roles) existingContext.roles = {};
        existingContext.roles[context.role] = (existingContext.roles[context.role] || 0) + 1;

        await fs.writeJson(this.contextFile, existingContext, { spaces: 2 });
    }

    async searchFiles(query, role = null, limit = 5) {
        const historyFile = path.join(this.memoryPath, 'history.jsonl');

        if (!await fs.pathExists(historyFile)) {
            return [];
        }

        const content = await fs.readFile(historyFile, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        const results = [];
        const queryLower = query.toLowerCase();

        for (const line of lines.reverse()) { // Recent first
            try {
                const context = JSON.parse(line);

                // Filter by role if specified
                if (role && context.role !== role) continue;

                // Simple text matching
                const taskMatch = context.task.toLowerCase().includes(queryLower);
                const resultMatch = context.result.toLowerCase().includes(queryLower);

                if (taskMatch || resultMatch) {
                    results.push({
                        id: context.id,
                        task: context.task,
                        result: context.result.substring(0, 500) + '...',
                        role: context.role,
                        timestamp: context.timestamp,
                        relevance: taskMatch ? 0.8 : 0.6
                    });
                }

                if (results.length >= limit) break;
            } catch (error) {
                continue; // Skip malformed lines
            }
        }

        return results.sort((a, b) => b.relevance - a.relevance);
    }

    async loadContextFile() {
        if (await fs.pathExists(this.contextFile)) {
            try {
                return await fs.readJson(this.contextFile);
            } catch (error) {
                console.warn('Failed to load context file:', error.message);
            }
        }
        return {};
    }

    async getRecentTasks(limit = 10) {
        const historyFile = path.join(this.memoryPath, 'history.jsonl');

        if (!await fs.pathExists(historyFile)) {
            return [];
        }

        const content = await fs.readFile(historyFile, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        return lines.slice(-limit).reverse().map(line => {
            try {
                const context = JSON.parse(line);
                return {
                    role: context.role,
                    task: context.task,
                    timestamp: context.timestamp
                };
            } catch (error) {
                return null;
            }
        }).filter(Boolean);
    }

    async detectFramework() {
        const indicators = {
            'package.json': 'Node.js/JavaScript',
            'requirements.txt': 'Python',
            'Cargo.toml': 'Rust',
            'go.mod': 'Go',
            'pom.xml': 'Java/Maven',
            'build.gradle': 'Java/Gradle'
        };

        for (const [file, framework] of Object.entries(indicators)) {
            if (await fs.pathExists(path.join(this.projectPath, file))) {
                return framework;
            }
        }

        return 'Unknown';
    }

    async detectLanguage() {
        const extensions = {
            '.js': 'JavaScript',
            '.ts': 'TypeScript',
            '.py': 'Python',
            '.rs': 'Rust',
            '.go': 'Go',
            '.java': 'Java',
            '.cpp': 'C++',
            '.c': 'C'
        };

        try {
            const files = await fs.readdir(this.projectPath);
            for (const file of files) {
                const ext = path.extname(file);
                if (extensions[ext]) {
                    return extensions[ext];
                }
            }
        } catch (error) {
            // Ignore errors
        }

        return 'Unknown';
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
}