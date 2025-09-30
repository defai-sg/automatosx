#!/usr/bin/env node

/**
 * Simple Memory Server Test
 * Quick test to verify memory server functionality
 */

import http from 'http';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// Read server port from file
let SERVER_PORT = 55277; // default
try {
    const portFile = path.join(process.cwd(), '.defai/memory/server.port');
    if (fs.existsSync(portFile)) {
        SERVER_PORT = parseInt(fs.readFileSync(portFile, 'utf8').trim());
    }
} catch (error) {
    console.warn('Could not read server port, using default 55277');
}

const SERVER_URL = `http://localhost:${SERVER_PORT}`;

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SERVER_URL);
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk.toString());
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(data.error || `HTTP ${res.statusCode}`));
                    }
                } catch (error) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();

        setTimeout(() => {
            req.destroy();
            reject(new Error('Request timeout'));
        }, 5000);
    });
}

function generateRandomEmbedding(dimension = 384) {
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
}

async function runTest() {
    console.log(chalk.bold.blue('🧪 Testing Memory Server Functionality\n'));

    try {
        // 1. Health check
        console.log(chalk.cyan('1. Health check...'));
        const health = await makeRequest('GET', '/health');
        console.log(chalk.green('✅ Server is healthy'), `(uptime: ${health.uptime.toFixed(2)}s)`);

        // 2. Store a memory
        console.log(chalk.cyan('\n2. Storing test memory...'));
        const testMemory = {
            id: 'test-memory-' + Date.now(),
            content: 'This is a test memory for concurrent write coordination validation.',
            embedding: generateRandomEmbedding(),
            metadata: {
                agent: 'test-agent',
                priority: 'high',
                category: 'test'
            }
        };

        const storeResult = await makeRequest('POST', '/memory', testMemory);
        console.log(chalk.green('✅ Memory stored'), `(operation: ${storeResult.operationId})`);

        // 3. Wait for processing
        console.log(chalk.cyan('\n3. Waiting for write processing...'));
        await new Promise(resolve => setTimeout(resolve, 500));

        // 4. Retrieve the memory
        console.log(chalk.cyan('4. Retrieving memory...'));
        const retrieveResult = await makeRequest('GET', `/memory?id=${testMemory.id}`);
        console.log(chalk.green('✅ Memory retrieved'), `(source: ${retrieveResult.source})`);

        // 5. Search for similar memories
        console.log(chalk.cyan('\n5. Searching for memories...'));
        const queryEmbedding = JSON.stringify(generateRandomEmbedding());
        const searchResult = await makeRequest('GET', `/memory/search?embedding=${encodeURIComponent(queryEmbedding)}&limit=5&threshold=0.3`);
        console.log(chalk.green('✅ Search completed'), `(found: ${searchResult.results.length})`);

        // 6. Get server stats
        console.log(chalk.cyan('\n6. Getting server statistics...'));
        const stats = await makeRequest('GET', '/stats');
        console.log(chalk.green('✅ Stats retrieved:'));
        console.log(chalk.gray(`   Queue Length: ${stats.stats.queueLength}`));
        console.log(chalk.gray(`   Cache Size: ${stats.stats.cacheSize}`));
        console.log(chalk.gray(`   Total Writes: ${stats.stats.writes}`));
        console.log(chalk.gray(`   Total Reads: ${stats.stats.reads}`));

        // 7. Delete the test memory
        console.log(chalk.cyan('\n7. Deleting test memory...'));
        const deleteResult = await makeRequest('DELETE', `/memory?id=${testMemory.id}`);
        console.log(chalk.green('✅ Memory deletion queued'), `(operation: ${deleteResult.operationId})`);

        console.log(chalk.bold.green('\n🎉 All tests passed! Memory server is working correctly.'));
        return true;

    } catch (error) {
        console.error(chalk.red('\n❌ Test failed:'), error.message);

        if (error.message.includes('ECONNREFUSED')) {
            console.log(chalk.yellow('\n💡 Tip: Start the memory server first:'));
            console.log(chalk.gray('   node src/scripts/start-memory-server.js'));
        }

        return false;
    }
}

// Run the test
runTest().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error(chalk.red('❌ Unexpected error:'), error);
    process.exit(1);
});
