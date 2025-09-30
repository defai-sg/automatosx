#!/usr/bin/env node

/**
 * Concurrent Memory Test
 * Tests the concurrent write coordination system for Milvus Lite
 *
 * This test simulates multiple agents writing to memory concurrently
 * and verifies that the single-writer coordination works correctly.
 */

import { MemoryServerClient } from '../memory/memory-server-client.js';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConcurrentMemoryTest {
    constructor() {
        this.projectPath = path.resolve(__dirname, '../../');
        this.server = null;
        this.testResults = {
            totalOperations: 0,
            successfulWrites: 0,
            successfulReads: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
    }

    async startMemoryServer() {
        console.log(chalk.blue('🚀 Starting Memory Server for testing...'));

        // Import and start the HTTP memory server
        const { MemoryServer } = await import('../../.claude/mcp/ax/http-memory-server.js');
        this.server = new MemoryServer(3002); // Use different port for testing
        await this.server.start();

        // Wait a moment for server to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(chalk.green('✅ Memory Server started on port 3002'));
    }

    async stopMemoryServer() {
        if (this.server) {
            await this.server.stop();
            console.log(chalk.yellow('🛑 Memory Server stopped'));
        }
    }

    generateRandomEmbedding(dimension = 384) {
        return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
    }

    async simulateAgent(agentId, writeCount, serverUrl) {
        console.log(chalk.cyan(`🤖 Agent ${agentId} starting with ${writeCount} operations`));

        const client = new MemoryServerClient(
            path.join(this.projectPath, `.defai/memory/test_agent_${agentId}.db`),
            serverUrl
        );

        await client.initialize();

        const results = {
            agentId,
            writes: 0,
            reads: 0,
            errors: []
        };

        try {
            // Perform concurrent writes
            for (let i = 0; i < writeCount; i++) {
                try {
                    const id = `agent-${agentId}-memory-${i}`;
                    const content = `This is memory ${i} from agent ${agentId}. Contains important information about concurrent processing.`;
                    const embedding = this.generateRandomEmbedding();
                    const metadata = {
                        agentId,
                        sequenceNumber: i,
                        priority: i % 3 === 0 ? 'high' : 'normal'
                    };

                    const writeResult = await client.insert(id, content, embedding, metadata);
                    results.writes++;

                    console.log(chalk.gray(`  📝 Agent ${agentId}: Wrote memory ${i} (${writeResult.status})`));

                    // Immediately try to read what we just wrote (read-your-writes consistency)
                    const readResult = await client.get(id);
                    if (readResult && readResult.id === id) {
                        results.reads++;
                        console.log(chalk.gray(`  📖 Agent ${agentId}: Read memory ${i} successfully`));
                    } else {
                        throw new Error(`Failed to read memory ${id} immediately after write`);
                    }

                    // Small delay to simulate real work
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

                } catch (error) {
                    results.errors.push({
                        operation: `write-${i}`,
                        error: error.message
                    });
                    console.log(chalk.red(`  ❌ Agent ${agentId}: Error on operation ${i}: ${error.message}`));
                }
            }

            // Perform some search operations
            console.log(chalk.blue(`🔍 Agent ${agentId}: Performing search operations`));
            for (let i = 0; i < 3; i++) {
                try {
                    const queryEmbedding = this.generateRandomEmbedding();
                    const searchResults = await client.search(queryEmbedding, 5, 0.3);

                    console.log(chalk.gray(`  🔍 Agent ${agentId}: Search ${i} returned ${searchResults.length} results`));
                } catch (error) {
                    results.errors.push({
                        operation: `search-${i}`,
                        error: error.message
                    });
                }
            }

        } finally {
            await client.close();
        }

        console.log(chalk.green(`✅ Agent ${agentId} completed: ${results.writes} writes, ${results.reads} reads, ${results.errors.length} errors`));
        return results;
    }

    async runConcurrentTest() {
        console.log(chalk.bold.blue('\n🧪 Running Concurrent Memory Test\n'));

        this.testResults.startTime = Date.now();

        try {
            // Start memory server
            await this.startMemoryServer();

            // Create multiple agents that will write concurrently
            const agentCount = 5;
            const writesPerAgent = 10;
            const serverUrl = 'http://localhost:3002';

            console.log(chalk.yellow(`\n🚀 Simulating ${agentCount} agents with ${writesPerAgent} writes each...\n`));

            // Start all agents concurrently
            const agentPromises = [];
            for (let i = 0; i < agentCount; i++) {
                agentPromises.push(this.simulateAgent(i + 1, writesPerAgent, serverUrl));
            }

            // Wait for all agents to complete
            const agentResults = await Promise.all(agentPromises);

            // Aggregate results
            for (const result of agentResults) {
                this.testResults.successfulWrites += result.writes;
                this.testResults.successfulReads += result.reads;
                this.testResults.errors.push(...result.errors);
            }

            this.testResults.totalOperations = agentCount * writesPerAgent;
            this.testResults.endTime = Date.now();

            // Final verification - check server stats
            console.log(chalk.blue('\n📊 Checking server statistics...\n'));

            const testClient = new MemoryServerClient(
                path.join(this.projectPath, '.defai/memory/test_verification.db'),
                serverUrl
            );
            await testClient.initialize();

            const stats = await testClient.getStats();
            console.log(chalk.cyan('Server Stats:'));
            console.log(`  Queue Length: ${stats.server?.queueLength || 0}`);
            console.log(`  Cache Size: ${stats.server?.cacheSize || 0}`);
            console.log(`  Total Writes: ${stats.server?.writes || 0}`);
            console.log(`  Server Requests: ${stats.client?.serverRequests || 0}`);
            console.log(`  Cache Hits: ${stats.server?.cacheHits || 0}`);

            await testClient.close();

        } finally {
            await this.stopMemoryServer();
        }

        this.printResults();
    }

    printResults() {
        console.log(chalk.bold.blue('\n📊 Test Results Summary\n'));

        const duration = this.testResults.endTime - this.testResults.startTime;
        const successRate = (this.testResults.successfulWrites / this.testResults.totalOperations) * 100;

        console.log(chalk.green(`✅ Total Operations: ${this.testResults.totalOperations}`));
        console.log(chalk.green(`✅ Successful Writes: ${this.testResults.successfulWrites}`));
        console.log(chalk.green(`✅ Successful Reads: ${this.testResults.successfulReads}`));
        console.log(chalk.yellow(`⚠️  Errors: ${this.testResults.errors.length}`));
        console.log(chalk.blue(`⏱️  Duration: ${duration}ms`));
        console.log(chalk.blue(`📈 Success Rate: ${successRate.toFixed(2)}%`));

        if (this.testResults.errors.length > 0) {
            console.log(chalk.red('\n❌ Errors encountered:'));
            this.testResults.errors.forEach((error, index) => {
                console.log(chalk.red(`  ${index + 1}. ${error.operation}: ${error.error}`));
            });
        }

        // Test evaluation
        if (successRate >= 95 && this.testResults.successfulReads >= this.testResults.successfulWrites * 0.9) {
            console.log(chalk.bold.green('\n🎉 CONCURRENT MEMORY TEST PASSED!'));
            console.log(chalk.green('✅ Single-writer coordination working correctly'));
            console.log(chalk.green('✅ Read-your-writes consistency maintained'));
            return true;
        } else {
            console.log(chalk.bold.red('\n❌ CONCURRENT MEMORY TEST FAILED!'));
            console.log(chalk.red('❌ Issues with concurrent write coordination or consistency'));
            return false;
        }
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new ConcurrentMemoryTest();
    test.runConcurrentTest()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red('❌ Test failed with error:'), error);
            process.exit(1);
        });
}

export { ConcurrentMemoryTest };