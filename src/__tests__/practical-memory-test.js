/**
 * Test the Practical Memory System
 * Validate functionality with sample conversations
 */

import { PracticalMemorySystem } from '../memory/practical-memory-system.js';
import path from 'path';
import fs from 'fs-extra';

// Test data - sample conversations
const testConversations = [
    {
        id: 'conv-001',
        agentRole: 'backend',
        userMessage: 'Create a REST API for user management with JWT authentication',
        agentResponse: 'I\'ll create a comprehensive REST API for user management. This will include API endpoints for registration, login, profile management, and proper JWT authentication with refresh tokens. We\'ll use Express.js with proper route handlers and middleware.',
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        metadata: {
            provider: 'claude-code',
            responseTime: 1200
        }
    },
    {
        id: 'conv-002',
        agentRole: 'frontend',
        userMessage: 'Design a responsive navbar component with React',
        agentResponse: 'I\'ll design a modern, responsive navbar component using React and CSS modules. It will include mobile hamburger menu, dropdown navigation, and smooth animations.',
        timestamp: new Date('2024-01-15T14:30:00Z').toISOString(),
        metadata: {
            provider: 'gemini-cli',
            responseTime: 800
        }
    },
    {
        id: 'conv-003',
        agentRole: 'backend',
        userMessage: 'Add database optimization for the user queries',
        agentResponse: 'I\'ll optimize the database queries by adding proper indexing, implementing query caching with Redis, and using database connection pooling for better performance.',
        timestamp: new Date('2024-01-15T16:45:00Z').toISOString(),
        metadata: {
            provider: 'claude-code',
            responseTime: 950
        }
    },
    {
        id: 'conv-004',
        agentRole: 'frontend',
        userMessage: 'Implement form validation with error handling',
        agentResponse: 'I\'ll implement comprehensive form validation using React Hook Form with Yup schema validation. This includes real-time validation, error messages, and accessibility features.',
        timestamp: new Date('2024-01-16T09:15:00Z').toISOString(),
        metadata: {
            provider: 'openai-cli',
            responseTime: 1100
        }
    },
    {
        id: 'conv-005',
        agentRole: 'devops',
        userMessage: 'Set up CI/CD pipeline with Docker deployment',
        agentResponse: 'I\'ll create a complete CI/CD pipeline using GitHub Actions with automated testing, Docker containerization, and deployment to staging and production environments.',
        timestamp: new Date('2024-01-16T11:30:00Z').toISOString(),
        metadata: {
            provider: 'claude-code',
            responseTime: 1400
        }
    }
];

async function runPracticalMemoryTest() {
    console.log('🧪 Testing Practical Memory System\n');

    // Create test environment
    const testDir = path.join(process.cwd(), '.test-memory');
    await fs.ensureDir(testDir);

    try {
        // Initialize memory system
        console.log('1️⃣ Initializing memory system...');
        const memory = new PracticalMemorySystem(testDir);
        await memory.initialize();
        console.log('✅ Memory system initialized\n');

        // Store test conversations
        console.log('2️⃣ Storing test conversations...');
        for (const conv of testConversations) {
            const id = await memory.storeConversation(conv);
            console.log(`   Stored: ${id} [${conv.agentRole}]`);
        }
        console.log('✅ All conversations stored\n');

        // Test search functionality
        console.log('3️⃣ Testing search functionality...');

        // Search by keyword
        console.log('   🔍 Searching for "API"...');
        const apiResults = await memory.search('API', { limit: 3 });
        console.log(`   Found ${apiResults.length} results:`);
        apiResults.forEach(r => {
            console.log(`     - [${r.agentRole}] ${r.preview?.substring(0, 50)}...`);
        });
        console.log('');

        // Search by agent
        console.log('   🔍 Searching backend conversations...');
        const backendResults = await memory.search('database', { agentRole: 'backend' });
        console.log(`   Found ${backendResults.length} backend results:`);
        backendResults.forEach(r => {
            console.log(`     - ${r.timestamp} - ${r.preview?.substring(0, 50)}...`);
        });
        console.log('');

        // Test agent history
        console.log('4️⃣ Testing agent history...');
        const backendHistory = await memory.getAgentHistory('backend', { limit: 10 });
        console.log(`   Backend agent has ${backendHistory.length} conversations:`);
        backendHistory.forEach(h => {
            console.log(`     - ${h.timestamp}: ${h.category || 'general'} | ${h.tags?.join(', ') || 'no tags'}`);
        });
        console.log('');

        // Test recent conversations
        console.log('5️⃣ Testing recent conversations...');
        const recent = await memory.getRecentConversations(3);
        console.log(`   ${recent.length} most recent conversations:`);
        recent.forEach(r => {
            console.log(`     - [${r.agentRole}] ${r.timestamp}: ${r.category || 'general'}`);
        });
        console.log('');

        // Test conversation threading
        console.log('6️⃣ Testing conversation threading...');
        const thread = await memory.getConversationThread('conv-003', 3);
        console.log(`   Thread for conv-003 has ${thread.length} related conversations:`);
        thread.forEach(t => {
            console.log(`     - ${t.id} [${t.agentRole}] ${t.relation || 'related'}`);
        });
        console.log('');

        // Test summarization
        console.log('7️⃣ Testing conversation summarization...');
        const conversationIds = testConversations.slice(0, 3).map(c => c.id);
        const summary = await memory.summarizeConversations(conversationIds);
        console.log('   Summary:');
        console.log(`     Count: ${summary.count} conversations`);
        console.log(`     Agents: ${summary.agents?.join(', ') || 'None'}`);
        console.log(`     Topics: ${summary.topics?.map(t => `${t.topic}(${t.count})`).join(', ') || 'None'}`);
        console.log('');

        // Test statistics
        console.log('8️⃣ Testing memory statistics...');
        const stats = await memory.getStatistics();
        console.log('   Statistics:');
        console.log(`     Total conversations: ${stats.totalConversations || 0}`);
        console.log(`     Agent breakdown:`, stats.agentBreakdown || {});
        console.log(`     Storage size: ${formatBytes(stats.storageSize || 0)}`);
        console.log(`     Top topics:`, stats.topTopics?.slice(0, 3) || []);

        if (stats.systemHealth) {
            console.log(`     System health:`, stats.systemHealth);
        }
        console.log('');

        console.log('🎉 All tests completed successfully!');

        // Performance test
        console.log('\n⚡ Performance test...');
        const startTime = Date.now();

        for (let i = 0; i < 10; i++) {
            await memory.search('test query', { limit: 5 });
        }

        const endTime = Date.now();
        const avgTime = (endTime - startTime) / 10;
        console.log(`   Average search time: ${avgTime.toFixed(2)}ms`);

        console.log('\n✅ Practical Memory System test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        // Cleanup
        try {
            await fs.remove(testDir);
            console.log('\n🧹 Test cleanup completed');
        } catch (cleanupError) {
            console.warn('⚠️ Cleanup failed:', cleanupError.message);
        }
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the test if this file is executed directly
if (process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
    runPracticalMemoryTest().catch(console.error);
} else {
    // Always run for testing purposes
    runPracticalMemoryTest().catch(console.error);
}

export { runPracticalMemoryTest, testConversations };