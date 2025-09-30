/**
 * Workspace Manager
 * Manages role-specific output directories and file organization
 * Ensures each agent role has dedicated workspace for outputs
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { getAllRoles } from '../agents/agent-profiles.js';

export class WorkspaceManager {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.workspaceRoot = path.join(projectPath, '.defai/workspaces');
        this.supportedRoles = new Set(getAllRoles());
    }

    /**
     * Get the workspace directory for a specific role
     * Only supports role-based workspaces for consistency
     */
    getRoleWorkspace(role) {
        // Validate role
        if (!this.supportedRoles.has(role)) {
            throw new Error(`Unsupported role: ${role}. Supported roles: ${Array.from(this.supportedRoles).join(', ')}`);
        }
        return path.join(this.workspaceRoot, 'roles', role);
    }

    /**
     * Ensure role workspace exists and is properly structured
     */
    async ensureRoleWorkspace(role) {
        try {
            const workspaceDir = this.getRoleWorkspace(role);

            // Create all subdirectories
            const subdirs = ['outputs', 'logs', 'tasks', 'context', 'artifacts'];
            for (const subdir of subdirs) {
                await fs.ensureDir(path.join(workspaceDir, subdir));
            }

            // Ensure README exists
            const readmePath = path.join(workspaceDir, 'README.md');
            if (!await fs.pathExists(readmePath)) {
                await this.createRoleREADME(role, readmePath);
            }

            return workspaceDir;
        } catch (error) {
            throw new Error(`Failed to create workspace for ${role}: ${error.message}`);
        }
    }

    /**
     * Save task output to role workspace
     */
    async saveTaskOutput(role, taskType, content, metadata = {}) {
        try {
            await this.ensureRoleWorkspace(role);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const taskId = crypto.randomBytes(4).toString('hex');
            const filename = `${timestamp}_${taskType}_${taskId}`;

            const outputPath = path.join(this.getRoleWorkspace(role), 'outputs', `${filename}.md`);

            // Create comprehensive output file
            const outputContent = this.formatTaskOutput(role, taskType, content, metadata, taskId, timestamp);

            await fs.writeFile(outputPath, outputContent);

            // Log the task execution
            await this.logTaskExecution(role, taskType, taskId, outputPath, metadata);

            // Update task history
            await this.updateTaskHistory(role, taskType, taskId, metadata);

            return {
                taskId,
                outputPath,
                workspace: this.getRoleWorkspace(role)
            };
        } catch (error) {
            throw new Error(`Failed to save task output for ${role}: ${error.message}`);
        }
    }

    /**
     * Save artifact files (supporting files, configs, etc.)
     */
    async saveArtifact(role, filename, content, description = '') {
        await this.ensureRoleWorkspace(role);

        const artifactPath = path.join(this.getRoleWorkspace(role), 'artifacts', filename);

        // Ensure artifact subdirectory exists if filename contains path
        await fs.ensureDir(path.dirname(artifactPath));

        await fs.writeFile(artifactPath, content);

        // Log artifact creation
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'artifact_created',
            filename: filename,
            description: description,
            path: artifactPath
        };

        await this.appendLog(role, logEntry);

        return artifactPath;
    }

    /**
     * Get recent outputs for a role
     */
    async getRecentOutputs(role, limit = 10) {
        const outputsDir = path.join(this.getRoleWorkspace(role), 'outputs');

        if (!await fs.pathExists(outputsDir)) {
            return [];
        }

        const files = await fs.readdir(outputsDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        // Sort by filename (which includes timestamp)
        mdFiles.sort().reverse();

        const recentFiles = mdFiles.slice(0, limit);
        const outputs = [];

        for (const file of recentFiles) {
            const filePath = path.join(outputsDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const stats = await fs.stat(filePath);

            outputs.push({
                filename: file,
                path: filePath,
                timestamp: stats.mtime,
                preview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
            });
        }

        return outputs;
    }

    /**
     * Get task execution logs for a role
     */
    async getTaskLogs(role, limit = 20) {
        const logsDir = path.join(this.getRoleWorkspace(role), 'logs');
        const logFile = path.join(logsDir, 'execution.jsonl');

        if (!await fs.pathExists(logFile)) {
            return [];
        }

        const content = await fs.readFile(logFile, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        return lines
            .slice(-limit)
            .map(line => JSON.parse(line))
            .reverse(); // Most recent first
    }

    /**
     * Clean up old outputs (keep last N outputs)
     */
    async cleanupOldOutputs(role, keepCount = 50) {
        const outputsDir = path.join(this.getRoleWorkspace(role), 'outputs');

        if (!await fs.pathExists(outputsDir)) {
            return { cleaned: 0 };
        }

        const files = await fs.readdir(outputsDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        if (mdFiles.length <= keepCount) {
            return { cleaned: 0 };
        }

        // Sort by filename (timestamp) and keep only recent ones
        mdFiles.sort();
        const filesToDelete = mdFiles.slice(0, mdFiles.length - keepCount);

        for (const file of filesToDelete) {
            await fs.unlink(path.join(outputsDir, file));
        }

        // Log cleanup
        await this.appendLog(role, {
            timestamp: new Date().toISOString(),
            type: 'cleanup_performed',
            files_removed: filesToDelete.length,
            kept_count: keepCount
        });

        return { cleaned: filesToDelete.length };
    }

    /**
     * Get workspace statistics for a role
     */
    async getWorkspaceStats(role) {
        const workspace = this.getRoleWorkspace(role);
        const stats = {
            role: role,
            totalOutputs: 0,
            totalArtifacts: 0,
            totalSize: 0,
            lastActivity: null,
            subdirectories: {}
        };

        if (!await fs.pathExists(workspace)) {
            return stats;
        }

        const subdirs = ['outputs', 'logs', 'tasks', 'context', 'artifacts'];

        for (const subdir of subdirs) {
            const subdirPath = path.join(workspace, subdir);
            if (await fs.pathExists(subdirPath)) {
                const files = await fs.readdir(subdirPath);
                stats.subdirectories[subdir] = files.length;

                if (subdir === 'outputs') stats.totalOutputs = files.length;
                if (subdir === 'artifacts') stats.totalArtifacts = files.length;
            } else {
                stats.subdirectories[subdir] = 0;
            }
        }

        // Calculate total size
        try {
            stats.totalSize = await this.calculateDirectorySize(workspace);
        } catch (error) {
            stats.totalSize = 0;
        }

        // Get last activity
        try {
            const recent = await this.getRecentOutputs(role, 1);
            if (recent.length > 0) {
                stats.lastActivity = recent[0].timestamp;
            }
        } catch (error) {
            // Ignore errors
        }

        return stats;
    }

    // Helper methods

    formatTaskOutput(role, taskType, content, metadata, taskId, timestamp) {
        return `# ${role.charAt(0).toUpperCase() + role.slice(1)} Agent Output

**Task ID**: ${taskId}
**Task Type**: ${taskType}
**Generated**: ${timestamp}
**Provider**: ${metadata.provider || 'Unknown'}
**Duration**: ${metadata.duration || 0}ms
**Cost**: $${metadata.cost || 0}

## Task Description

${metadata.task || 'No description provided'}

## Generated Content

${content}

## Metadata

\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`

---
*Generated by AutomatosX v2.0 ${role} agent*
`;
    }

    async logTaskExecution(role, taskType, taskId, outputPath, metadata) {
        const logsDir = path.join(this.getRoleWorkspace(role), 'logs');
        const logFile = path.join(logsDir, 'execution.jsonl');

        const logEntry = {
            timestamp: new Date().toISOString(),
            taskId: taskId,
            role: role,
            taskType: taskType,
            outputPath: outputPath,
            provider: metadata.provider,
            duration: metadata.duration,
            cost: metadata.cost,
            success: metadata.success !== false
        };

        await this.appendLog(role, logEntry);
    }

    async updateTaskHistory(role, taskType, taskId, metadata) {
        try {
            const tasksDir = path.join(this.getRoleWorkspace(role), 'tasks');
            const historyFile = path.join(tasksDir, 'history.json');

            let history = [];
            if (await fs.pathExists(historyFile)) {
                try {
                    history = await fs.readJson(historyFile);
                } catch (error) {
                    console.warn(`Warning: Could not read history file for ${role}: ${error.message}`);
                    history = [];
                }
            }

            history.unshift({
                taskId: taskId,
                taskType: taskType,
                timestamp: new Date().toISOString(),
                metadata: metadata
            });

            // Keep only last 100 tasks
            history = history.slice(0, 100);

            await fs.writeJson(historyFile, history, { spaces: 2 });
        } catch (error) {
            console.warn(`Warning: Could not update task history for ${role}: ${error.message}`);
        }
    }

    async appendLog(role, logEntry) {
        const logsDir = path.join(this.getRoleWorkspace(role), 'logs');
        const logFile = path.join(logsDir, 'execution.jsonl');

        await fs.ensureDir(logsDir);
        await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    }

    async createRoleREADME(role, readmePath) {
        const content = `# ${role.charAt(0).toUpperCase() + role.slice(1)} Agent Workspace

This directory contains all outputs and artifacts generated by the ${role} agent.

## Directory Structure

- \`outputs/\` - Generated code, documents, and deliverables
- \`logs/\` - Execution logs and debug information
- \`tasks/\` - Task history and results
- \`context/\` - Agent-specific context and memory
- \`artifacts/\` - Supporting files and resources

## Usage

The ${role} agent will automatically save its work here when you use:
\`/ax:${role} your-task-description\`

All outputs are timestamped and organized for easy retrieval.

## Recent Activity

Check \`outputs/\` for the latest generated content or use:
- \`logs/execution.jsonl\` for detailed execution logs
- \`tasks/history.json\` for task history

---
*Workspace managed by AutomatosX v2.0*
`;
        await fs.writeFile(readmePath, content);
    }

    async calculateDirectorySize(dirPath) {
        let totalSize = 0;

        async function traverse(currentPath) {
            const items = await fs.readdir(currentPath);

            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                const stats = await fs.stat(itemPath);

                if (stats.isDirectory()) {
                    await traverse(itemPath);
                } else {
                    totalSize += stats.size;
                }
            }
        }

        await traverse(dirPath);
        return totalSize;
    }
}
