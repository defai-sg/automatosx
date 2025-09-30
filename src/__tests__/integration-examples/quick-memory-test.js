#!/usr/bin/env node

/**
 * Quick test for Optimized Memory System
 */

import { PracticalMemorySystem } from '../../memory/practical-memory-system.js';
import fs from 'fs-extra';
import path from 'path';

async function quickTest() {
    console.log('🧪 Quick Optimized Memory System Test\n');

    const testPath = path.join(process.cwd(), '.quick-test-memory');

    try {
        // Clean test directory
        await fs.remove(testPath);

        // Initialize memory system
        console.log('📋 Initializing memory system...');
        const memorySystem = new PracticalMemorySystem(testPath, {
            maxActiveMemories: 100,
            enablePerformanceTracking: true,
            relevanceThreshold: 0.3
        });

        await memorySystem.initialize();
        console.log('✅ Memory system initialized\n');

        // Test storage
        console.log('💾 Testing storage...');
        const testConversation = {
            agentRole: 'backend',
            content: 'Implement user authentication system',
            response: 'Created JWT-based authentication with refresh tokens and secure session management.',
            category: 'api',
            metadata: {
                provider: 'test',
                model: 'test-model',
                responseTime: 1000,
                tokensUsed: 400
            }
        };

        const conversationId = await memorySystem.storeConversation(testConversation);
        console.log(`✅ Stored conversation: ${conversationId}\n`);

        // Test search
        console.log('🔍 Testing search...');
        const searchResults = await memorySystem.search('authentication', {
            agentRole: 'backend',
            limit: 5
        });

        console.log(`✅ Found ${searchResults.length} results`);
        for (const result of searchResults) {
            const content = result.content || result.task || 'No content';
            const score = result.relevanceScore?.toFixed(3) || 'N/A';
            console.log(`   - Score: ${score} | "${content.substring(0, 50)}..."`);
        }
        console.log('');

        // Test statistics
        console.log('📊 Testing statistics...');
        const stats = await memorySystem.getStatistics();
        console.log(`✅ Total conversations: ${stats.totalConversations || 0}`);
        console.log(`✅ Storage size: ${stats.storageSize || 0} bytes`);
        console.log(`✅ Agent breakdown: ${Object.keys(stats.agentBreakdown || {}).length} agents`);

        // Show recent activity
        if (stats.recentActivity && stats.recentActivity.length > 0) {
            console.log(`✅ Recent activity: ${stats.recentActivity.length} recent conversations`);
        }

        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await fs.remove(testPath);
        console.log('✅ Cleanup completed');

        console.log('\n🎉 Quick test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);

        // Cleanup on error
        try {
            await fs.remove(testPath);
        } catch (cleanupError) {
            console.warn('⚠️ Cleanup failed:', cleanupError.message);
        }

        process.exit(1);
    }
}

// Run test
quickTest().catch(console.error);