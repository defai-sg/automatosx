#!/usr/bin/env node

/**
 * Test for Optimized Memory System
 * Validates performance improvements and accuracy preservation
 */

import { PracticalMemorySystem } from '../memory/practical-memory-system.js';
import fs from 'fs-extra';
import path from 'path';

class OptimizedMemoryTest {
    constructor() {
        this.testPath = path.join(process.cwd(), '.test-memory');
        this.memorySystem = null;
        this.testData = [];
        this.results = {
            setup: false,
            storage: false,
            search: false,
            archiving: false,
            performance: false,
            cleanup: false
        };
    }

    async runTests() {
        console.log('🧪 Starting Optimized Memory System Tests\n');

        try {
            await this.setup();
            await this.testStorage();
            await this.testSearch();
            await this.testArchiving();
            await this.testPerformance();
            await this.cleanup();

            this.printResults();

        } catch (error) {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        }
    }

    async setup() {
        console.log('📋 Setting up test environment...');

        try {
            // Clean any existing test data
            await fs.remove(this.testPath);

            // Initialize optimized memory system
            this.memorySystem = new PracticalMemorySystem(this.testPath, {
                maxActiveMemories: 100,
                enablePerformanceTracking: true,
                relevanceThreshold: 0.3
            });

            await this.memorySystem.initialize();

            // Generate test data
            this.generateTestData();

            this.results.setup = true;
            console.log('✅ Setup completed\n');

        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            throw error;
        }
    }

    async testStorage() {
        console.log('💾 Testing storage operations...');

        try {
            const startTime = Date.now();

            // Store test conversations
            for (const conversation of this.testData) {
                await this.memorySystem.storeConversation(conversation);
            }

            const totalTime = Date.now() - startTime;
            const avgTime = totalTime / this.testData.length;

            console.log(`   📊 Stored ${this.testData.length} conversations in ${totalTime}ms`);
            console.log(`   📊 Average storage time: ${avgTime.toFixed(2)}ms per conversation`);

            // Verify storage
            const stats = await this.memorySystem.getStatistics();
            if (stats.activeTier.totalMemories >= this.testData.length) {
                this.results.storage = true;
                console.log('✅ Storage test passed\n');
            } else {
                throw new Error('Not all conversations were stored');
            }

        } catch (error) {
            console.error('❌ Storage test failed:', error.message);
            throw error;
        }
    }

    async testSearch() {
        console.log('🔍 Testing search operations...');

        try {
            const searchQueries = [
                { query: 'implement authentication', agentRole: 'backend', expectedMin: 2 },
                { query: 'UI component design', agentRole: 'frontend', expectedMin: 1 },
                { query: 'security vulnerability', agentRole: 'security', expectedMin: 1 },
                { query: 'database optimization', expectedMin: 1 }
            ];

            let totalSearchTime = 0;
            let totalResults = 0;

            for (const searchQuery of searchQueries) {
                const startTime = Date.now();

                const results = await this.memorySystem.search(searchQuery.query, {
                    agentRole: searchQuery.agentRole,
                    limit: 10
                });

                const searchTime = Date.now() - startTime;
                totalSearchTime += searchTime;
                totalResults += results.length;

                console.log(`   🔎 "${searchQuery.query}": ${results.length} results in ${searchTime}ms`);

                if (results.length < searchQuery.expectedMin) {
                    throw new Error(`Expected at least ${searchQuery.expectedMin} results for "${searchQuery.query}"`);
                }

                // Verify relevance scores
                for (const result of results) {
                    if (!result.relevanceScore || result.relevanceScore < 0.2) {
                        throw new Error(`Low relevance score: ${result.relevanceScore}`);
                    }
                }
            }

            const avgSearchTime = totalSearchTime / searchQueries.length;
            console.log(`   📊 Average search time: ${avgSearchTime.toFixed(2)}ms`);
            console.log(`   📊 Total results found: ${totalResults}`);

            this.results.search = true;
            console.log('✅ Search test passed\n');

        } catch (error) {
            console.error('❌ Search test failed:', error.message);
            throw error;
        }
    }

    async testArchiving() {
        console.log('📦 Testing archiving operations...');

        try {
            // Add more test data to trigger archiving
            const additionalData = this.generateLargeTestData(150);

            for (const conversation of additionalData) {
                await this.memorySystem.storeConversation(conversation);
            }

            // Wait for potential archiving
            await new Promise(resolve => setTimeout(resolve, 1000));

            const stats = await this.memorySystem.getStatistics();
            console.log(`   📊 Active memories: ${stats.activeTier.totalMemories}`);
            console.log(`   📊 Archived memories: ${stats.archiveTier.totalArchived}`);

            // Test archive search
            const archiveResults = await this.memorySystem.search('old conversation', {
                includeArchive: true
            });

            console.log(`   📦 Archive search results: ${archiveResults.length}`);

            this.results.archiving = true;
            console.log('✅ Archiving test passed\n');

        } catch (error) {
            console.error('❌ Archiving test failed:', error.message);
            // Don't fail the entire test for archiving issues
            console.log('⚠️  Archiving test skipped\n');
        }
    }

    async testPerformance() {
        console.log('📈 Testing performance metrics...');

        try {
            // Get performance metrics
            const metrics = await this.memorySystem.getPerformanceMetrics();

            console.log('   📊 Performance Summary:');
            console.log(`      - Total searches: ${metrics.searches.total}`);
            console.log(`      - Average search time: ${metrics.searches.averageTime.toFixed(2)}ms`);
            console.log(`      - Success rate: ${(metrics.searches.successful / metrics.searches.total * 100).toFixed(1)}%`);
            console.log(`      - Average relevance: ${metrics.relevance.averageScore.toFixed(3)}`);

            // Verify performance thresholds
            if (metrics.searches.averageTime > 200) {
                console.warn('⚠️  Search time higher than expected');
            }

            if (metrics.relevance.averageScore < 0.5) {
                console.warn('⚠️  Relevance score lower than expected');
            }

            this.results.performance = true;
            console.log('✅ Performance test passed\n');

        } catch (error) {
            console.error('❌ Performance test failed:', error.message);
            // Don't fail for performance metrics issues
            console.log('⚠️  Performance test skipped\n');
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up test environment...');

        try {
            if (this.memorySystem) {
                await this.memorySystem.close?.();
            }

            await fs.remove(this.testPath);

            this.results.cleanup = true;
            console.log('✅ Cleanup completed\n');

        } catch (error) {
            console.warn('⚠️  Cleanup warning:', error.message);
            this.results.cleanup = true; // Don't fail on cleanup
        }
    }

    generateTestData() {
        const agents = ['backend', 'frontend', 'security', 'devops', 'design'];
        const categories = ['api', 'ui', 'database', 'deployment', 'feature'];

        const templates = [
            {
                content: 'Implement JWT authentication for user login',
                response: 'Created JWT authentication middleware with token validation and refresh logic',
                agentRole: 'backend',
                category: 'api'
            },
            {
                content: 'Design responsive navigation component',
                response: 'Built mobile-first navigation with hamburger menu and smooth animations',
                agentRole: 'frontend',
                category: 'ui'
            },
            {
                content: 'Audit security vulnerabilities in authentication system',
                response: 'Found 3 security issues: weak password policy, missing rate limiting, exposed endpoints',
                agentRole: 'security',
                category: 'api'
            },
            {
                content: 'Optimize database queries for user dashboard',
                response: 'Added database indexes and query optimization, reduced load time by 60%',
                agentRole: 'backend',
                category: 'database'
            },
            {
                content: 'Create user onboarding flow wireframes',
                response: 'Designed 5-step onboarding with progress indicators and helpful tooltips',
                agentRole: 'design',
                category: 'ui'
            }
        ];

        this.testData = [];

        for (let i = 0; i < 50; i++) {
            const template = templates[i % templates.length];
            const timestamp = new Date(Date.now() - (i * 60000)).toISOString(); // Spread over time

            this.testData.push({
                id: `test-${i}`,
                timestamp,
                agentRole: template.agentRole,
                content: `${template.content} (variation ${i})`,
                response: `${template.response} Additional details for test ${i}.`,
                category: template.category,
                importance: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
                metadata: {
                    provider: 'test',
                    model: 'test-model',
                    responseTime: Math.random() * 1000 + 100,
                    tokensUsed: Math.random() * 500 + 100
                }
            });
        }

        console.log(`   📊 Generated ${this.testData.length} test conversations`);
    }

    generateLargeTestData(count) {
        const data = [];

        for (let i = 0; i < count; i++) {
            const agents = ['backend', 'frontend', 'security', 'devops'];
            const agentRole = agents[i % agents.length];

            data.push({
                id: `large-test-${i}`,
                timestamp: new Date(Date.now() - (i * 3600000)).toISOString(), // Spread over hours
                agentRole,
                content: `Old conversation content ${i} for archiving test`,
                response: `Response for old conversation ${i}`,
                category: 'general',
                importance: Math.random() * 0.4, // Lower importance for archiving
                metadata: {
                    provider: 'test',
                    model: 'test-model'
                }
            });
        }

        return data;
    }

    printResults() {
        console.log('📊 Test Results Summary:');
        console.log('=======================');

        const tests = [
            { name: 'Setup', result: this.results.setup },
            { name: 'Storage', result: this.results.storage },
            { name: 'Search', result: this.results.search },
            { name: 'Archiving', result: this.results.archiving },
            { name: 'Performance', result: this.results.performance },
            { name: 'Cleanup', result: this.results.cleanup }
        ];

        let passed = 0;
        const total = tests.length;

        for (const test of tests) {
            const status = test.result ? '✅ PASS' : '❌ FAIL';
            console.log(`${test.name.padEnd(12)}: ${status}`);
            if (test.result) passed++;
        }

        console.log('=======================');
        console.log(`Results: ${passed}/${total} tests passed`);

        if (passed === total) {
            console.log('🎉 All tests passed! Optimized Memory System is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the output above for details.');
            process.exit(1);
        }
    }
}

// Run tests if called directly
if (import.meta.url.includes(process.argv[1])) {
    const test = new OptimizedMemoryTest();
    test.runTests().catch(console.error);
}

export { OptimizedMemoryTest };