#!/usr/bin/env node

/**
 * Memory Server Startup Script
 * Starts the AutomatosX Memory Server for concurrent write coordination
 */

import { MemoryServer } from '../../.claude/mcp/ax/http-memory-server.js';
import chalk from 'chalk';

console.log(chalk.bold.blue('🚀 AutomatosX Memory Server Startup\n'));

const requestedPort = process.env.PORT ? parseInt(process.env.PORT) : null;
const server = new MemoryServer(requestedPort);

try {
    await server.start();
    const actualPort = server.actualPort;
    console.log(chalk.green('\n✅ Memory Server is ready for concurrent operations!'));
    console.log(chalk.cyan('📡 To test concurrent operations:'));
    console.log(chalk.gray('   npm start run backend "test message 1" &'));
    console.log(chalk.gray('   npm start run frontend "test message 2" &'));
    console.log(chalk.gray('   npm start run quality "test message 3" &'));
    console.log(chalk.cyan('\n📊 To monitor server stats:'));
    console.log(chalk.gray(`   curl http://localhost:${actualPort}/stats`));
    console.log(chalk.cyan('\n🧹 To clear memory:'));
    console.log(chalk.gray(`   curl -X POST http://localhost:${actualPort}/clear -H "Content-Type: application/json" -d '{"confirm":true}'`));
} catch (error) {
    console.error(chalk.red('❌ Failed to start Memory Server:'), error.message);
    process.exit(1);
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(chalk.yellow(`\n🛑 Received ${signal}, shutting down Memory Server...`));
    try {
        await server.stop();
        console.log(chalk.green('✅ Memory Server stopped gracefully'));
        console.log(chalk.green('🧹 Port file cleaned up'));
    } catch (error) {
        console.error(chalk.red('❌ Error during shutdown:'), error.message);
    }
    process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error(chalk.red('💥 Uncaught Exception:'), error);
    try {
        await server.stop();
    } catch (stopError) {
        console.error(chalk.red('❌ Error during emergency shutdown:'), stopError.message);
    }
    process.exit(1);
});