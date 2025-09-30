/**
 * Memory Management CLI Commands for AutomatosX
 * Practical memory operations: search, analyze, and organize conversations
 */

import { ChatHistoryManager } from '../core/chat-history.js';
import { MemoryClearSystem } from '../scripts/memory-clear.js';

export const memoryCommands = {
    async search(query, options = {}) {
        console.log(`🔍 Searching conversations for: "${query}"`);

        const chatHistory = new ChatHistoryManager();
        await chatHistory.initialize();

        try {
            const results = await chatHistory.enhancedSearch(query, {
                agentRole: options.agent,
                limit: options.limit || 10,
                includeThreads: options.includeThreads || false
            });

            if (results.length === 0) {
                console.log('📭 No conversations found matching your query.');
                return;
            }

            console.log(`\n✅ Found ${results.length} matching conversations:\n`);

            for (const [index, result] of results.entries()) {
                console.log(`${index + 1}. [${result.agentRole}] ${result.timestamp}`);
                console.log(`   ID: ${result.id}`);
                console.log(`   Preview: ${result.preview || result.userMessage?.substring(0, 100) || 'No preview'}...`);

                if (result.category) {
                    console.log(`   Category: ${result.category}`);
                }

                if (result.tags && result.tags.length > 0) {
                    console.log(`   Tags: ${result.tags.join(', ')}`);
                }

                if (result.sources) {
                    console.log(`   Sources: ${result.sources.join(', ')}`);
                }

                console.log(`   Score: ${(result.score || result.relevanceScore || 0).toFixed(2)}`);
                console.log('');

                // Show conversation threads if requested
                if (options.includeThreads && result.thread && result.thread.length > 0) {
                    console.log(`   🧵 Related conversations (${result.thread.length}):`);
                    for (const related of result.thread.slice(0, 3)) {
                        console.log(`      - [${related.agentRole}] ${related.timestamp} (${related.relation})`);
                    }
                    console.log('');
                }
            }

        } catch (error) {
            console.error('❌ Search failed:', error.message);
        }
    },

    async show(conversationId) {
        console.log(`📄 Showing conversation: ${conversationId}`);

        const chatHistory = new ChatHistoryManager();
        await chatHistory.initialize();

        try {
            // Get the conversation thread
            const thread = await chatHistory.getConversationThread(conversationId, 5);

            if (thread.length === 0) {
                console.log('📭 Conversation not found or no related conversations.');
                return;
            }

            console.log(`\n🧵 Conversation Thread (${thread.length} conversations):\n`);

            for (const [index, conv] of thread.entries()) {
                const isCurrent = conv.id === conversationId;
                const marker = isCurrent ? '👉' : '  ';

                console.log(`${marker} ${index + 1}. [${conv.agentRole}] ${conv.timestamp}`);
                console.log(`   ID: ${conv.id}`);

                if (isCurrent) {
                    console.log(`   *** CURRENT CONVERSATION ***`);
                }

                if (conv.relation) {
                    console.log(`   Relation: ${conv.relation} (${conv.timeDifference?.toFixed(1)}h ago)`);
                }

                console.log(`   Preview: ${conv.preview || 'No preview available'}...`);
                console.log('');
            }

        } catch (error) {
            console.error('❌ Failed to show conversation:', error.message);
        }
    },

    async history(agentRole, options = {}) {
        console.log(`📚 Getting conversation history for agent: ${agentRole}`);

        const chatHistory = new ChatHistoryManager();
        await chatHistory.initialize();

        try {
            const history = await chatHistory.getAgentHistory(agentRole, {
                limit: options.limit || 20,
                timeRange: options.timeRange
            });

            if (history.length === 0) {
                console.log(`📭 No conversation history found for agent: ${agentRole}`);
                return;
            }

            console.log(`\n✅ Found ${history.length} conversations for ${agentRole}:\n`);

            // Group by date for better organization
            const groupedByDate = this.groupByDate(history);

            for (const [date, conversations] of Object.entries(groupedByDate)) {
                console.log(`📅 ${date} (${conversations.length} conversations)`);

                for (const conv of conversations) {
                    const time = new Date(conv.timestamp).toLocaleTimeString();
                    console.log(`   ${time} - ${conv.id}`);
                    console.log(`   ${conv.category || 'general'} | ${conv.tags?.join(', ') || 'no tags'}`);
                    console.log(`   Preview: ${conv.preview?.substring(0, 80) || 'No preview'}...`);
                    console.log('');
                }
                console.log('');
            }

        } catch (error) {
            console.error('❌ Failed to get agent history:', error.message);
        }
    },

    async recent(limit = 10) {
        console.log(`📰 Getting ${limit} most recent conversations`);

        const chatHistory = new ChatHistoryManager();
        await chatHistory.initialize();

        try {
            const recent = await chatHistory.getRecentConversations(limit);

            if (recent.length === 0) {
                console.log('📭 No recent conversations found.');
                return;
            }

            console.log(`\n✅ ${recent.length} recent conversations:\n`);

            for (const [index, conv] of recent.entries()) {
                const timeAgo = this.getTimeAgo(conv.timestamp);

                console.log(`${index + 1}. [${conv.agentRole}] ${timeAgo}`);
                console.log(`   ID: ${conv.id}`);
                console.log(`   Category: ${conv.category || 'general'}`);
                console.log(`   Preview: ${conv.preview?.substring(0, 100) || 'No preview'}...`);
                console.log('');
            }

        } catch (error) {
            console.error('❌ Failed to get recent conversations:', error.message);
        }
    },

    async stats() {
        console.log('📊 Getting memory statistics');

        const chatHistory = new ChatHistoryManager();
        await chatHistory.initialize();

        try {
            const stats = await chatHistory.getAgentStats();

            console.log('\n📈 Memory Statistics:\n');

            // Overview
            console.log('📋 Overview:');
            console.log(`   Total Conversations: ${stats.totalConversations || 0}`);
            console.log(`   Storage Size: ${this.formatBytes(stats.storageSize || 0)}`);
            console.log('');

            // Agent breakdown
            if (stats.agentUsage || stats.agentBreakdown) {
                console.log('🤖 Agent Usage:');
                const agentStats = stats.agentUsage || stats.agentBreakdown || {};
                for (const [agent, count] of Object.entries(agentStats)) {
                    const percentage = stats.totalConversations ?
                        ((count / stats.totalConversations) * 100).toFixed(1) : '0.0';
                    console.log(`   ${agent}: ${count} conversations (${percentage}%)`);
                }
                console.log('');
            }

            // Recent activity
            if (stats.recentActivity) {
                console.log('⚡ Recent Activity:');
                console.log(`   Today: ${stats.recentActivity.today || 0} conversations`);
                console.log(`   Yesterday: ${stats.recentActivity.yesterday || 0} conversations`);
                console.log(`   This Week: ${stats.recentActivity.thisWeek || 0} conversations`);
                console.log(`   This Month: ${stats.recentActivity.thisMonth || 0} conversations`);
                console.log('');
            }

            // Top topics
            if (stats.topTopics && stats.topTopics.length > 0) {
                console.log('🏷️  Top Topics:');
                for (const topic of stats.topTopics.slice(0, 10)) {
                    console.log(`   ${topic.topic}: ${topic.count} mentions`);
                }
                console.log('');
            }

            // System status
            if (stats.systemStatus) {
                console.log('🔧 System Status:');
                console.log(`   Practical Memory: ${stats.systemStatus.practicalMemory ? '✅ Active' : '❌ Inactive'}`);
                console.log(`   Vector Database: ${stats.systemStatus.vectorDatabase ? '✅ Active' : '❌ Inactive'}`);
                console.log(`   Last Updated: ${stats.systemStatus.lastUpdated || 'Unknown'}`);
            }

        } catch (error) {
            console.error('❌ Failed to get statistics:', error.message);
        }
    },

    async summarize(conversationIds) {
        console.log(`📝 Summarizing ${conversationIds.length} conversations`);

        const chatHistory = new ChatHistoryManager();
        await chatHistory.initialize();

        try {
            const summary = await chatHistory.summarizeConversations(conversationIds);

            console.log('\n📊 Conversation Summary:\n');
            console.log(`📈 Count: ${summary.count} conversations`);
            console.log(`🤖 Agents: ${summary.agents?.join(', ') || 'None'}`);

            if (summary.timeSpan) {
                const start = new Date(summary.timeSpan.start).toLocaleString();
                const end = new Date(summary.timeSpan.end).toLocaleString();
                console.log(`⏰ Time Span: ${start} to ${end}`);
            }

            if (summary.topics && summary.topics.length > 0) {
                console.log('\n🏷️  Topics Discussed:');
                for (const topic of summary.topics) {
                    console.log(`   ${topic.topic}: ${topic.count} mentions`);
                }
            }

            if (summary.preview && summary.preview.length > 0) {
                console.log('\n👀 Preview of Conversations:');
                for (const [index, prev] of summary.preview.entries()) {
                    console.log(`${index + 1}. [${prev.agent}] ${prev.timestamp}`);
                    console.log(`   ${prev.preview}`);
                    console.log('');
                }
            }

        } catch (error) {
            console.error('❌ Failed to summarize conversations:', error.message);
        }
    },

    async clear(type = null, options = {}) {
        console.log('🧹 Memory Clear System');
        console.log('💭 Bob: "Let\'s build this rock-solid."');

        const clearSystem = new MemoryClearSystem();

        try {
            if (!type) {
                // Show memory statistics
                await clearSystem.showStats();
                console.log('\nUsage:');
                console.log('  memory clear all               # Clear all memory systems');
                console.log('  memory clear milvus            # Clear Milvus database only');
                console.log('  memory clear practical         # Clear practical memory only');
                console.log('  memory clear chat              # Clear chat history only');
                console.log('  memory clear cache             # Clear cache only');
                return;
            }

            if (type === 'all') {
                console.log('🚨 WARNING: This will clear ALL memory data!');
                const results = await clearSystem.clearAll();

                console.log('\n📋 Clear Results:');
                console.log(`✅ Legacy Systems: ${results.milvus && results.chatHistory ? 'Success' : 'Partial'}`);
                console.log(`✅ New Systems: ${results.practicalMemory ? 'Success' : 'Failed'}`);
                console.log(`✅ Cache: ${results.cache ? 'Success' : 'Failed'}`);

                if (results.errors.length > 0) {
                    console.log('\n⚠️  Errors:');
                    results.errors.forEach(error => console.log(`   ${error}`));
                }

                console.log('\n🎭 Bob: "Memory cleared rock-solid!"');
            } else {
                // Clear specific type
                await clearSystem.clearSpecific(type);
                console.log(`\n🎭 Bob: "${type} memory cleared rock-solid!"`);
            }

        } catch (error) {
            console.error('❌ Memory clear failed:', error.message);
            console.log('🎭 Bob: "Something went wrong, but we\'ll fix it!"');
        }
    },

    async cleanup(options = {}) {
        console.log('🧹 Advanced Memory Cleanup');

        try {
            // This integrates with the clear system for more advanced operations
            console.log('Advanced cleanup features:');
            console.log('   - Use "memory clear all" for complete cleanup');
            console.log('   - Use "memory clear practical" for new memory system only');
            console.log('   - Use "memory clear milvus" for legacy vector database');
            console.log('   - Use "memory clear chat" for chat history only');
            console.log('');
            console.log('Future advanced features:');
            console.log('   - Smart duplicate detection and removal');
            console.log('   - Conversation archiving by age');
            console.log('   - Index rebuilding and optimization');
            console.log('   - Memory usage analysis and recommendations');

        } catch (error) {
            console.error('❌ Cleanup failed:', error.message);
        }
    },

    // Helper methods
    groupByDate(conversations) {
        const groups = {};

        for (const conv of conversations) {
            const date = new Date(conv.timestamp).toLocaleDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(conv);
        }

        return groups;
    },

    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffHours / 24;

        if (diffHours < 1) {
            const minutes = Math.floor(diffMs / (1000 * 60));
            return `${minutes} minutes ago`;
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)} hours ago`;
        } else if (diffDays < 7) {
            return `${Math.floor(diffDays)} days ago`;
        } else {
            return past.toLocaleDateString();
        }
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// CLI interface for memory commands
export function handleMemoryCommand(command, args) {
    switch (command) {
        case 'search':
            if (!args[0]) {
                console.log('Usage: memory search <query> [--agent <agent>] [--limit <number>] [--threads]');
                return;
            }
            return memoryCommands.search(args[0], {
                agent: args.includes('--agent') ? args[args.indexOf('--agent') + 1] : null,
                limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 10,
                includeThreads: args.includes('--threads')
            });

        case 'show':
            if (!args[0]) {
                console.log('Usage: memory show <conversation-id>');
                return;
            }
            return memoryCommands.show(args[0]);

        case 'history':
            if (!args[0]) {
                console.log('Usage: memory history <agent-role> [--limit <number>]');
                return;
            }
            return memoryCommands.history(args[0], {
                limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 20
            });

        case 'recent':
            return memoryCommands.recent(
                args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 10
            );

        case 'stats':
            return memoryCommands.stats();

        case 'summarize':
            if (args.length === 0) {
                console.log('Usage: memory summarize <conversation-id1> [conversation-id2] ...');
                return;
            }
            return memoryCommands.summarize(args);

        case 'clear':
            if (args.length === 0) {
                return memoryCommands.clear();
            }
            return memoryCommands.clear(args[0]);

        case 'cleanup':
            return memoryCommands.cleanup();

        default:
            console.log('Available memory commands:');
            console.log('  search <query>        - Search conversations');
            console.log('  show <id>             - Show conversation thread');
            console.log('  history <agent>       - Get agent conversation history');
            console.log('  recent                - Show recent conversations');
            console.log('  stats                 - Show memory statistics');
            console.log('  summarize <ids...>    - Summarize conversations');
            console.log('  clear [type]          - Clear memory data (integrates /ax:clear)');
            console.log('  cleanup               - Advanced cleanup operations');
            console.log('');
            console.log('Examples:');
            console.log('  memory search "API design" --agent backend --threads');
            console.log('  memory history backend --limit 30');
            console.log('  memory show conv-123456789');
            console.log('  memory recent --limit 5');
            console.log('  memory clear all      # Clear all memory systems');
            console.log('  memory clear practical # Clear new memory system only');
    }
}