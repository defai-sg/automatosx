#!/usr/bin/env node

/**
 * Usage Example: AutomatosX Optimized Memory System
 * Demonstrates how to use the new memory system for improved performance and accuracy
 */

import { PracticalMemorySystem } from '../../memory/practical-memory-system.js';

class OptimizedMemoryUsageExample {
    async main() {
        console.log('🚀 AutomatosX Optimized Memory System Usage Example\n');

        // 1. Initialize with configuration for different deployment sizes
        await this.demonstrateInitialization();

        // 2. Show storage operations with performance tracking
        await this.demonstrateStorage();

        // 3. Show intelligent search with multi-tier lookup
        await this.demonstrateSearch();

        // 4. Show agent context optimization
        await this.demonstrateAgentContext();

        // 5. Show performance monitoring
        await this.demonstratePerformanceMonitoring();

        // 6. Show archiving and maintenance
        await this.demonstrateArchiving();

        console.log('✅ Example completed successfully!');
    }

    async demonstrateInitialization() {
        console.log('📋 1. System Initialization\n');

        // Small deployment configuration
        const smallConfig = {
            maxActiveMemories: 5000,
            enablePerformanceTracking: true,
            relevanceThreshold: 0.4,
            compressionInterval: 12 * 60 * 60 * 1000, // 12 hours
            semanticSearchWeight: 0.6,
            keywordSearchWeight: 0.4
        };

        // Medium deployment configuration
        const mediumConfig = {
            maxActiveMemories: 15000,
            archiveThreshold: 50000,
            enablePerformanceTracking: true,
            relevanceThreshold: 0.3,
            compressionInterval: 6 * 60 * 60 * 1000, // 6 hours
            semanticSearchWeight: 0.7,
            keywordSearchWeight: 0.3
        };

        // Large deployment configuration
        const largeConfig = {
            maxActiveMemories: 25000,
            archiveThreshold: 100000,
            enablePerformanceTracking: true,
            relevanceThreshold: 0.25,
            compressionInterval: 3 * 60 * 60 * 1000, // 3 hours
            semanticSearchWeight: 0.8,
            keywordSearchWeight: 0.2
        };

        console.log('Small deployment config:', JSON.stringify(smallConfig, null, 2));
        console.log('\nMedium deployment config:', JSON.stringify(mediumConfig, null, 2));
        console.log('\nLarge deployment config:', JSON.stringify(largeConfig, null, 2));

        // Initialize system for this example
        this.memorySystem = new PracticalMemorySystem('./.example-memory', mediumConfig);
        await this.memorySystem.initialize();

        console.log('\n✅ Memory system initialized\n');
    }

    async demonstrateStorage() {
        console.log('💾 2. Intelligent Storage Operations\n');

        const sampleConversations = [
            {
                agentRole: 'backend',
                content: 'Implement JWT authentication with refresh tokens',
                response: 'Created JWT authentication system with access/refresh token rotation, secure cookie storage, and Redis session management.',
                category: 'api',
                metadata: {
                    provider: 'claude-code',
                    model: 'claude-3-sonnet',
                    responseTime: 1250,
                    tokensUsed: 420
                }
            },
            {
                agentRole: 'frontend',
                content: 'Create responsive dashboard with dark mode',
                response: 'Built responsive dashboard using CSS Grid and Flexbox with system preference detection and manual toggle for dark mode.',
                category: 'ui',
                metadata: {
                    provider: 'claude-code',
                    model: 'claude-3-sonnet',
                    responseTime: 980,
                    tokensUsed: 350
                }
            },
            {
                agentRole: 'security',
                content: 'Audit API endpoints for security vulnerabilities',
                response: 'Identified 3 critical issues: missing rate limiting on /auth endpoints, SQL injection risk in search API, and exposed debug information.',
                category: 'security',
                metadata: {
                    provider: 'claude-code',
                    model: 'claude-3-sonnet',
                    responseTime: 2100,
                    tokensUsed: 580
                }
            }
        ];

        console.log('Storing conversations with automatic tiering...');

        for (const conversation of sampleConversations) {
            const conversationId = await this.memorySystem.storeConversation(conversation);
            console.log(`   ✅ Stored: ${conversationId} (${conversation.agentRole})`);
        }

        console.log('\n✅ Storage demonstration completed\n');
    }

    async demonstrateSearch() {
        console.log('🔍 3. Intelligent Search Operations\n');

        const searchExamples = [
            {
                description: 'Agent-specific search',
                query: 'authentication implementation',
                options: { agentRole: 'backend', limit: 5 }
            },
            {
                description: 'Category-filtered search',
                query: 'security vulnerabilities',
                options: { category: 'security', limit: 3 }
            },
            {
                description: 'Multi-tier search with archive',
                query: 'dashboard design',
                options: { includeArchive: true, limit: 10 }
            },
            {
                description: 'Time-range search',
                query: 'API development',
                options: {
                    timeRange: {
                        start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
                        end: Date.now()
                    },
                    limit: 5
                }
            }
        ];

        for (const example of searchExamples) {
            console.log(`🔎 ${example.description}:`);
            console.log(`   Query: "${example.query}"`);
            console.log(`   Options:`, JSON.stringify(example.options, null, 6));

            const results = await this.memorySystem.search(example.query, example.options);

            console.log(`   Results: ${results.length} found`);

            for (const result of results.slice(0, 2)) { // Show first 2 results
                console.log(`     - Score: ${result.relevanceScore?.toFixed(3)} | ${result.agentRole} | ${result.source}`);
                const content = result.content || result.task || 'No content available';
                console.log(`       "${content.substring(0, 60)}..."`);
            }
            console.log('');
        }

        console.log('✅ Search demonstration completed\n');
    }

    async demonstrateAgentContext() {
        console.log('🎯 4. Agent History Retrieval\n');

        const agentRoles = ['backend', 'frontend', 'security'];

        for (const agentRole of agentRoles) {
            console.log(`📋 Getting recent history for ${agentRole} agent:`);

            const history = await this.memorySystem.getAgentHistory(agentRole, {
                limit: 5,
                timeRange: {
                    start: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
                    end: Date.now()
                }
            });

            console.log(`   History items: ${history.length}`);

            for (const item of history) {
                const content = item.content || item.task || 'No content available';
                const preview = content.substring(0, 50);
                const timestamp = new Date(item.timestamp).toISOString().split('T')[0];
                console.log(`     - ${timestamp} | "${preview}..."`);
            }
            console.log('');
        }

        console.log('✅ Agent history demonstration completed\n');
    }

    async demonstratePerformanceMonitoring() {
        console.log('📊 5. Performance Monitoring\n');

        // Get current statistics (available method)
        const stats = await this.memorySystem.getStatistics();

        console.log('Memory System Summary:');
        console.log(`   Total Conversations: ${stats.totalConversations || 0}`);
        console.log(`   Storage Size: ${this.formatBytes(stats.storageSize || 0)}`);
        console.log(`   Agent Count: ${Object.keys(stats.agentBreakdown || {}).length}`);
        console.log(`   Recent Activity: ${stats.recentActivity?.length || 0} conversations`);

        if (stats.agentBreakdown) {
            console.log('\nAgent Breakdown:');
            for (const [agent, count] of Object.entries(stats.agentBreakdown)) {
                console.log(`     ${agent}: ${count} conversations`);
            }
        }

        console.log('\n✅ Performance monitoring demonstration completed\n');
    }

    async demonstrateArchiving() {
        console.log('📦 6. Storage and Maintenance\n');

        // Get system statistics
        const stats = await this.memorySystem.getStatistics();

        console.log('Memory System Information:');
        console.log(`   Total Storage: ${this.formatBytes(stats.storageSize || 0)}`);
        console.log(`   Total Conversations: ${stats.totalConversations || 0}`);
        console.log(`   Active Agents: ${Object.keys(stats.agentBreakdown || {}).length}`);

        if (stats.recentActivity && stats.recentActivity.length > 0) {
            console.log(`   Recent Activity: ${stats.recentActivity.length} conversations`);
            console.log('   Latest conversations:');
            stats.recentActivity.slice(0, 3).forEach((activity, index) => {
                const timestamp = new Date(activity.timestamp).toISOString().split('T')[0];
                console.log(`     ${index + 1}. ${activity.agentRole} - ${timestamp}`);
            });
        }

        // Show maintenance features
        console.log('\nMaintenance Features:');
        console.log('   - Automatic file-based storage ✅');
        console.log('   - Vector database integration ✅');
        console.log('   - Conversation indexing ✅');
        console.log('   - Cross-agent search capabilities ✅');

        console.log('\n✅ Storage and maintenance demonstration completed\n');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async cleanup() {
        if (this.memorySystem) {
            await this.memorySystem.close?.();
        }
    }
}

// Configuration examples for different scenarios
export const configExamples = {
    development: {
        maxActiveMemories: 1000,
        enablePerformanceTracking: true,
        relevanceThreshold: 0.4,
        compressionInterval: 60 * 60 * 1000, // 1 hour
        semanticSearchWeight: 0.5,
        keywordSearchWeight: 0.5
    },

    staging: {
        maxActiveMemories: 5000,
        enablePerformanceTracking: true,
        relevanceThreshold: 0.35,
        compressionInterval: 6 * 60 * 60 * 1000, // 6 hours
        semanticSearchWeight: 0.6,
        keywordSearchWeight: 0.4
    },

    production: {
        maxActiveMemories: 20000,
        archiveThreshold: 75000,
        enablePerformanceTracking: true,
        relevanceThreshold: 0.3,
        compressionInterval: 3 * 60 * 60 * 1000, // 3 hours
        semanticSearchWeight: 0.7,
        keywordSearchWeight: 0.3
    },

    highVolume: {
        maxActiveMemories: 50000,
        archiveThreshold: 200000,
        enablePerformanceTracking: true,
        relevanceThreshold: 0.25,
        compressionInterval: 60 * 60 * 1000, // 1 hour
        semanticSearchWeight: 0.8,
        keywordSearchWeight: 0.2
    }
};

// Run example if called directly
if (import.meta.url.includes(process.argv[1])) {
    const example = new OptimizedMemoryUsageExample();

    example.main()
        .then(() => example.cleanup())
        .catch(error => {
            console.error('❌ Example failed:', error.message);
            process.exit(1);
        });
}

export { OptimizedMemoryUsageExample };