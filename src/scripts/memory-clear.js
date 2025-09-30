#!/usr/bin/env node

/**
 * AutomatosX Memory Clear System
 * Bob's implementation for clearing Milvus memory and chat history
 * Let's build this rock-solid.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MemoryClearSystem {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.memoryPaths = {
            // Legacy paths
            milvus: path.join(projectPath, '.defai/memory'),
            chatHistory: path.join(projectPath, '.defai/chat-history'),
            fallback: path.join(projectPath, '.defai/memory/fallback'),
            cache: path.join(projectPath, '.claude/cache'),

            // New practical memory system paths
            practicalMemory: path.join(projectPath, '.defai/memory'),
            hybridMemory: path.join(projectPath, '.defai/hybrid-memory'),
            enhancedMemory: path.join(projectPath, '.defai/enhanced-memory'),

            // New concurrent memory server paths
            memoryServer: path.join(projectPath, '.defai/memory'),
            serverPort: path.join(projectPath, '.defai/memory/server.port'),
            serverDatabase: path.join(projectPath, '.defai/memory/milvus_server.db'),
            vectorFiles: path.join(projectPath, '.defai/memory/vectors.jsonl'),
            indexFiles: path.join(projectPath, '.defai/memory/index.json')
        };
    }

    async clearAll() {
        console.log('🧹 Bob: Starting complete memory clear...');
        console.log('💭 "Let\'s build this rock-solid."');

        const results = {
            milvus: false,
            chatHistory: false,
            fallback: false,
            cache: false,
            practicalMemory: false,
            hybridMemory: false,
            enhancedMemory: false,
            memoryServer: false,
            serverProcesses: false,
            errors: []
        };

        // Stop memory server processes first
        try {
            await this.stopMemoryServerProcesses();
            results.serverProcesses = true;
            console.log('✅ Memory server processes stopped');
        } catch (error) {
            results.errors.push(`Memory server process stop failed: ${error.message}`);
            console.warn('⚠️  Memory server process stop failed:', error.message);
        }

        // Clear Milvus database files
        try {
            await this.clearMilvusData();
            results.milvus = true;
            console.log('✅ Milvus database cleared');
        } catch (error) {
            results.errors.push(`Milvus clear failed: ${error.message}`);
            console.warn('⚠️  Milvus clear failed:', error.message);
        }

        // Clear chat history
        try {
            await this.clearChatHistory();
            results.chatHistory = true;
            console.log('✅ Chat history cleared');
        } catch (error) {
            results.errors.push(`Chat history clear failed: ${error.message}`);
            console.warn('⚠️  Chat history clear failed:', error.message);
        }

        // Clear fallback memory files
        try {
            await this.clearFallbackMemory();
            results.fallback = true;
            console.log('✅ Fallback memory cleared');
        } catch (error) {
            results.errors.push(`Fallback memory clear failed: ${error.message}`);
            console.warn('⚠️  Fallback memory clear failed:', error.message);
        }

        // Clear transformer cache
        try {
            await this.clearCache();
            results.cache = true;
            console.log('✅ Transformer cache cleared');
        } catch (error) {
            results.errors.push(`Cache clear failed: ${error.message}`);
            console.warn('⚠️  Cache clear failed:', error.message);
        }

        // Clear practical memory system
        try {
            await this.clearPracticalMemory();
            results.practicalMemory = true;
            console.log('✅ Practical memory system cleared');
        } catch (error) {
            results.errors.push(`Practical memory clear failed: ${error.message}`);
            console.warn('⚠️  Practical memory clear failed:', error.message);
        }

        // Clear hybrid memory system
        try {
            await this.clearHybridMemory();
            results.hybridMemory = true;
            console.log('✅ Hybrid memory system cleared');
        } catch (error) {
            results.errors.push(`Hybrid memory clear failed: ${error.message}`);
            console.warn('⚠️  Hybrid memory clear failed:', error.message);
        }

        // Clear enhanced memory system
        try {
            await this.clearEnhancedMemory();
            results.enhancedMemory = true;
            console.log('✅ Enhanced memory system cleared');
        } catch (error) {
            results.errors.push(`Enhanced memory clear failed: ${error.message}`);
            console.warn('⚠️  Enhanced memory clear failed:', error.message);
        }

        // Clear memory server files
        try {
            await this.clearMemoryServerFiles();
            results.memoryServer = true;
            console.log('✅ Memory server files cleared');
        } catch (error) {
            results.errors.push(`Memory server clear failed: ${error.message}`);
            console.warn('⚠️  Memory server clear failed:', error.message);
        }

        return results;
    }

    async clearMilvusData() {
        const milvusPath = this.memoryPaths.milvus;

        if (await fs.pathExists(milvusPath)) {
            // Remove all .db files and memory.jsonl
            const files = await fs.readdir(milvusPath);
            const filesToRemove = files.filter(file =>
                file.endsWith('.db') ||
                file === 'memory.jsonl' ||
                file.startsWith('milvus.')
            );

            for (const file of filesToRemove) {
                const filePath = path.join(milvusPath, file);
                await fs.remove(filePath);
                console.log(`🗑️  Removed: ${file}`);
            }
        }
    }

    async clearChatHistory() {
        const chatHistoryPath = this.memoryPaths.chatHistory;

        if (await fs.pathExists(chatHistoryPath)) {
            // Remove all .jsonl session files
            const files = await fs.readdir(chatHistoryPath);
            const sessionFiles = files.filter(file => file.endsWith('.jsonl'));

            for (const file of sessionFiles) {
                const filePath = path.join(chatHistoryPath, file);
                await fs.remove(filePath);
                console.log(`🗑️  Removed chat session: ${file}`);
            }
        }
    }

    async clearFallbackMemory() {
        const fallbackPath = this.memoryPaths.fallback;

        if (await fs.pathExists(fallbackPath)) {
            // Remove all memory files
            const files = await fs.readdir(fallbackPath);
            const memoryFiles = files.filter(file => file.endsWith('.json'));

            for (const file of memoryFiles) {
                const filePath = path.join(fallbackPath, file);
                await fs.remove(filePath);
                console.log(`🗑️  Removed fallback memory: ${file}`);
            }
        }
    }

    async clearCache() {
        const cachePath = this.memoryPaths.cache;

        if (await fs.pathExists(cachePath)) {
            // Remove transformer cache and other cached data
            await fs.remove(cachePath);
            console.log(`🗑️  Removed cache directory`);
        }
    }

    async clearPracticalMemory() {
        const practicalPath = this.memoryPaths.practicalMemory;

        if (await fs.pathExists(practicalPath)) {
            console.log(`🗑️  Clearing practical memory system...`);

            // Clear conversations by date structure
            const conversationsPath = path.join(practicalPath, 'conversations');
            if (await fs.pathExists(conversationsPath)) {
                await fs.remove(conversationsPath);
                console.log(`   Removed conversations storage`);
            }

            // Clear search index
            const indexPath = path.join(practicalPath, 'index.json');
            if (await fs.pathExists(indexPath)) {
                await fs.remove(indexPath);
                console.log(`   Removed search index`);
            }

            // Clear any other practical memory files
            const files = await fs.readdir(practicalPath);
            for (const file of files) {
                if (file.endsWith('.jsonl') || file.endsWith('.db')) {
                    const filePath = path.join(practicalPath, file);
                    await fs.remove(filePath);
                    console.log(`   Removed: ${file}`);
                }
            }
        }
    }

    async clearHybridMemory() {
        const hybridPath = this.memoryPaths.hybridMemory;

        if (await fs.pathExists(hybridPath)) {
            console.log(`🗑️  Clearing hybrid memory system...`);

            // Clear graph database
            const graphDbPath = path.join(hybridPath, 'graph.db');
            if (await fs.pathExists(graphDbPath)) {
                await fs.remove(graphDbPath);
                console.log(`   Removed graph database`);
            }

            // Clear temporal index
            const temporalDbPath = path.join(hybridPath, 'temporal.db');
            if (await fs.pathExists(temporalDbPath)) {
                await fs.remove(temporalDbPath);
                console.log(`   Removed temporal index`);
            }

            // Clear other hybrid files
            const files = await fs.readdir(hybridPath);
            for (const file of files) {
                if (file.endsWith('.db') || file.endsWith('.jsonl')) {
                    const filePath = path.join(hybridPath, file);
                    await fs.remove(filePath);
                    console.log(`   Removed: ${file}`);
                }
            }
        }
    }

    async clearEnhancedMemory() {
        const enhancedPath = this.memoryPaths.enhancedMemory;

        if (await fs.pathExists(enhancedPath)) {
            console.log(`🗑️  Clearing enhanced memory system...`);

            // Clear knowledge graph files
            const knowledgeGraphPath = path.join(enhancedPath, 'knowledge-graph');
            if (await fs.pathExists(knowledgeGraphPath)) {
                await fs.remove(knowledgeGraphPath);
                console.log(`   Removed knowledge graph`);
            }

            // Clear other enhanced memory files
            await fs.remove(enhancedPath);
            console.log(`   Removed enhanced memory directory`);
        }
    }

    async stopMemoryServerProcesses() {
        const { execSync } = await import('child_process');

        try {
            // Find memory server processes
            const processes = execSync('ps aux | grep "memory-server\\|http-memory-server" | grep -v grep', { encoding: 'utf8' });

            if (processes.trim()) {
                console.log('🔍 Found memory server processes:');
                console.log(processes);

                // Kill memory server processes
                execSync('pkill -f "memory-server\\|http-memory-server"', { encoding: 'utf8' });
                console.log('🔪 Terminated memory server processes');

                // Wait a moment for cleanup
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log('ℹ️  No memory server processes found');
            }
        } catch (error) {
            if (error.status === 1) {
                // No processes found, which is fine
                console.log('ℹ️  No memory server processes to stop');
            } else {
                throw error;
            }
        }
    }

    async clearMemoryServerFiles() {
        const filesToClear = [
            this.memoryPaths.serverPort,
            this.memoryPaths.serverDatabase,
            this.memoryPaths.vectorFiles,
            this.memoryPaths.indexFiles
        ];

        for (const filePath of filesToClear) {
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
                console.log(`🗑️  Removed: ${path.basename(filePath)}`);
            }
        }

        // Also clear any additional memory server files
        const memoryServerDir = this.memoryPaths.memoryServer;
        if (await fs.pathExists(memoryServerDir)) {
            const files = await fs.readdir(memoryServerDir);
            const serverFiles = files.filter(file =>
                file.includes('server') ||
                file.includes('milvus_server') ||
                file.endsWith('.port') ||
                file === 'vectors.jsonl' ||
                file === 'index.json'
            );

            for (const file of serverFiles) {
                const filePath = path.join(memoryServerDir, file);
                await fs.remove(filePath);
                console.log(`🗑️  Removed server file: ${file}`);
            }
        }
    }

    async clearSpecific(type) {
        console.log(`🧹 Bob: Clearing ${type} memory...`);

        switch (type) {
            case 'milvus':
                await this.clearMilvusData();
                console.log('✅ Milvus data cleared');
                break;
            case 'chat':
                await this.clearChatHistory();
                console.log('✅ Chat history cleared');
                break;
            case 'fallback':
                await this.clearFallbackMemory();
                console.log('✅ Fallback memory cleared');
                break;
            case 'cache':
                await this.clearCache();
                console.log('✅ Cache cleared');
                break;
            case 'practical':
                await this.clearPracticalMemory();
                console.log('✅ Practical memory cleared');
                break;
            case 'hybrid':
                await this.clearHybridMemory();
                console.log('✅ Hybrid memory cleared');
                break;
            case 'enhanced':
                await this.clearEnhancedMemory();
                console.log('✅ Enhanced memory cleared');
                break;
            default:
                throw new Error(`Unknown memory type: ${type}. Available: milvus, chat, fallback, cache, practical, hybrid, enhanced`);
        }
    }

    async getMemoryStats() {
        const stats = {
            milvus: { exists: false, size: 0, files: [] },
            chatHistory: { exists: false, size: 0, files: [] },
            fallback: { exists: false, size: 0, files: [] },
            cache: { exists: false, size: 0, files: [] },
            practicalMemory: { exists: false, size: 0, files: [] },
            hybridMemory: { exists: false, size: 0, files: [] },
            enhancedMemory: { exists: false, size: 0, files: [] }
        };

        for (const [type, dirPath] of Object.entries(this.memoryPaths)) {
            try {
                if (await fs.pathExists(dirPath)) {
                    stats[type].exists = true;
                    const files = await fs.readdir(dirPath);
                    stats[type].files = files;

                    // Calculate total size
                    let totalSize = 0;
                    for (const file of files) {
                        const filePath = path.join(dirPath, file);
                        const stat = await fs.stat(filePath);
                        if (stat.isFile()) {
                            totalSize += stat.size;
                        }
                    }
                    stats[type].size = totalSize;
                }
            } catch (error) {
                console.warn(`Failed to get stats for ${type}:`, error.message);
            }
        }

        return stats;
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    async showStats() {
        console.log('📊 AutomatosX Memory Statistics:');
        console.log('');

        const stats = await this.getMemoryStats();

        for (const [type, data] of Object.entries(stats)) {
            const status = data.exists ? '✅' : '❌';
            const size = this.formatSize(data.size);
            const fileCount = data.files.length;

            console.log(`${status} ${type.toUpperCase()}: ${fileCount} files, ${size}`);

            if (data.exists && data.files.length > 0) {
                const recentFiles = data.files.slice(0, 3);
                recentFiles.forEach(file => {
                    console.log(`   📄 ${file}`);
                });
                if (data.files.length > 3) {
                    console.log(`   ... and ${data.files.length - 3} more files`);
                }
            }
            console.log('');
        }
    }
}

async function main() {
    const action = process.argv[2]?.toLowerCase();
    const type = process.argv[3]?.toLowerCase();

    const clearSystem = new MemoryClearSystem();

    try {
        switch (action) {
            case 'all':
                console.log('🚨 WARNING: This will clear ALL memory data!');
                const results = await clearSystem.clearAll();

                console.log('\n📋 Clear Results:');
                console.log(`✅ Milvus: ${results.milvus ? 'Success' : 'Failed'}`);
                console.log(`✅ Chat History: ${results.chatHistory ? 'Success' : 'Failed'}`);
                console.log(`✅ Fallback Memory: ${results.fallback ? 'Success' : 'Failed'}`);
                console.log(`✅ Cache: ${results.cache ? 'Success' : 'Failed'}`);
                console.log(`✅ Practical Memory: ${results.practicalMemory ? 'Success' : 'Failed'}`);
                console.log(`✅ Hybrid Memory: ${results.hybridMemory ? 'Success' : 'Failed'}`);
                console.log(`✅ Enhanced Memory: ${results.enhancedMemory ? 'Success' : 'Failed'}`);

                if (results.errors.length > 0) {
                    console.log('\n⚠️  Errors:');
                    results.errors.forEach(error => console.log(`   ${error}`));
                }

                console.log('\n🎭 Bob: "Memory cleared rock-solid!"');
                break;

            case 'type':
                if (!type) {
                    console.log('Usage: node memory-clear.js type <milvus|chat|fallback|cache>');
                    process.exit(1);
                }
                await clearSystem.clearSpecific(type);
                console.log(`\n🎭 Bob: "${type} memory cleared rock-solid!"`);
                break;

            case 'stats':
                await clearSystem.showStats();
                break;

            default:
                console.log(`🎭 Bob's Memory Clear System`);
                console.log(`💭 "Let's build this rock-solid."`);
                console.log('');
                console.log('Usage:');
                console.log('  node memory-clear.js all          # Clear all memory data');
                console.log('  node memory-clear.js type milvus  # Clear specific type');
                console.log('  node memory-clear.js stats        # Show memory statistics');
                console.log('');
                console.log('Available types: milvus, chat, fallback, cache, practical, hybrid, enhanced');
                break;
        }
    } catch (error) {
        console.error('❌ Memory clear failed:', error.message);
        console.log('🎭 Bob: "Something went wrong, but we\'ll fix it!"');
        process.exit(1);
    }
}

// Check if this script is being run directly
if (process.argv[1] && (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('memory-clear.js'))) {
    main().catch(console.error);
}

export { MemoryClearSystem };