#!/usr/bin/env node

/**
 * Enhanced AutomatosX Entry Point
 * Agent Platform-style profiles with CLI-first architecture
 * Chat history tracking via Milvus for inspection and tracing
 */

import { program } from 'commander';
import chalk from 'chalk';
import { EnhancedAutomatosXRouter } from './core/enhanced-router.js';
import { loadConfig } from './utils/config-loader.js';
import { handleMemoryCommand } from './commands/memory.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

// Global router instance
let router = null;

/**
 * Initialize router with project context
 */
async function initializeRouter(projectPath = process.cwd()) {
    if (router) return router;

    try {
        const config = await loadConfig(projectPath);
        router = new EnhancedAutomatosXRouter(projectPath, config);
        await router.initialize();
        return router;
    } catch (error) {
        console.error(chalk.red('❌ Failed to initialize AutomatosX:'), error.message);
        process.exit(1);
    }
}

/**
 * Main execution command
 */
program
    .name('automatosx')
    .description('Enhanced AI agent orchestration with Agent Platform-style profiles')
    .version(pkg.version);

/**
 * Execute a task with specified agent role
 */
program
    .command('run')
    .description('Execute a task with specified agent role')
    .argument('<role>', 'Agent role (backend, frontend, ceo, research, etc.)')
    .argument('<task>', 'Task description or prompt')
    .option('-s, --stage <stage>', 'Specific workflow stage to execute')
    .option('--workflow', 'Execute full multi-stage workflow')
    .option('--session <id>', 'Use specific chat session ID')
    .option('--new-session', 'Start a new chat session')
    .action(async (role, task, options) => {
        const r = await initializeRouter();

        try {
            // Handle session management
            if (options.newSession) {
                const sessionId = r.startNewSession();
                console.log(chalk.blue(`📝 Started new session: ${sessionId}`));
            }

            let result;

            if (options.workflow) {
                // Execute full workflow
                result = await r.executeWorkflow(role, task);

                console.log(chalk.green('🎯 Workflow Results:'));
                result.results.forEach((stageResult, index) => {
                    console.log(chalk.cyan(`\n📍 Stage ${index + 1}: ${result.stages[index]}`));
                    console.log(chalk.gray('Provider:'), stageResult.provider);
                    console.log(chalk.gray('Model:'), stageResult.model);
                    console.log(chalk.gray('Response Time:'), `${stageResult.responseTime}ms`);
                    console.log('\n' + stageResult.content.substring(0, 500) + '...\n');
                });

                console.log(chalk.green('🏁 Final Result:'));
                console.log(result.finalResult);

            } else {
                // Execute single task
                result = await r.routeTask(role, task, { stage: options.stage });

                console.log(chalk.green('🎯 Task Result:'));
                console.log(chalk.gray('Agent:'), result.role);
                console.log(chalk.gray('Stage:'), result.stage);
                console.log(chalk.gray('Provider:'), result.provider);
                console.log(chalk.gray('Model:'), result.model);
                console.log(chalk.gray('Response Time:'), `${result.responseTime}ms`);

                if (result.tokensUsed) {
                    console.log(chalk.gray('Tokens Used:'), result.tokensUsed);
                }

                console.log('\n' + chalk.white(result.content));
            }

        } catch (error) {
            console.error(chalk.red('❌ Task execution failed:'), error.message);
            process.exit(1);
        }
    });

/**
 * List available agent roles
 */
program
    .command('agents')
    .description('List available agent roles and their capabilities')
    .option('--detailed', 'Show detailed agent information')
    .action(async (options) => {
        const r = await initializeRouter();

        const roles = r.getAvailableRoles();

        console.log(chalk.blue('🤖 Available Agent Roles:'));
        console.log('');

        roles.forEach(role => {
            const info = r.getAgentInfo(role);

            console.log(chalk.green(`📋 ${role.toUpperCase()}`));
            console.log(chalk.gray('Description:'), info.description.substring(0, 100) + '...');

            if (info.hasPersonality && info.personality) {
                console.log(chalk.cyan(`👤 ${info.personality.name} - ${info.personality.title}`));
                console.log(chalk.yellow(`"${info.personality.catchphrase}"`));
            }

            if (options.detailed) {
                console.log(chalk.gray('Stages:'), info.stages.join(' → '));
                if (info.personality) {
                    console.log(chalk.gray('Specializations:'), info.personality.specializations.join(', '));
                }
            }

            console.log('');
        });
    });

/**
 * Search chat history
 */
program
    .command('history')
    .description('Search and inspect chat history')
    .argument('[query]', 'Search query (optional)')
    .option('-r, --role <role>', 'Filter by agent role')
    .option('-l, --limit <limit>', 'Number of results to show', '10')
    .option('--stats', 'Show conversation statistics')
    .action(async (query, options) => {
        const r = await initializeRouter();

        if (options.stats) {
            const stats = await r.getStats();

            console.log(chalk.blue('📊 Chat Statistics:'));
            console.log(chalk.gray('Total Conversations:'), stats.conversations.totalConversations);
            console.log(chalk.gray('Total Tokens Used:'), stats.conversations.totalTokensUsed);
            console.log('');

            console.log(chalk.cyan('Agent Usage:'));
            Object.entries(stats.conversations.agentUsage).forEach(([agent, count]) => {
                console.log(`  ${agent}: ${count} conversations`);
            });
            console.log('');

            console.log(chalk.cyan('Provider Usage:'));
            Object.entries(stats.conversations.providerUsage).forEach(([provider, count]) => {
                console.log(`  ${provider}: ${count} requests`);
            });

        } else if (query) {
            const results = await r.searchHistory(query, options.role, parseInt(options.limit));

            if (results.length === 0) {
                console.log(chalk.yellow('🔍 No matching conversations found'));
                return;
            }

            console.log(chalk.blue(`🔍 Found ${results.length} matching conversations:`));
            console.log('');

            results.forEach((result, index) => {
                console.log(chalk.green(`${index + 1}. ${result.agentRole} - ${result.timestamp}`));
                console.log(chalk.gray('User:'), result.userMessage.substring(0, 100) + '...');
                console.log(chalk.gray('Agent:'), result.agentResponse.substring(0, 200) + '...');
                console.log(chalk.gray('Relevance:'), (result.relevanceScore * 100).toFixed(1) + '%');
                console.log('');
            });

        } else {
            console.log(chalk.yellow('🔍 Use "defai-ax history <query>" to search or --stats to see statistics'));
        }
    });

/**
 * Enhanced memory management
 */
program
    .command('memory')
    .description('Enhanced memory management and search')
    .argument('<subcommand>', 'Memory command (search, show, history, recent, stats, summarize, cleanup)')
    .argument('[args...]', 'Arguments for the subcommand')
    .action(async (subcommand, args) => {
        try {
            await handleMemoryCommand(subcommand, args);
        } catch (error) {
            console.error(chalk.red('❌ Memory command failed:'), error.message);
            process.exit(1);
        }
    });

/**
 * System status and health check
 */
program
    .command('status')
    .description('Show system status and provider availability')
    .action(async () => {
        const r = await initializeRouter();

        console.log(chalk.blue('🚀 AutomatosX Enhanced System Status:'));
        console.log('');

        const stats = await r.getStats();

        console.log(chalk.green('✅ System Initialized:'), stats.initialized);
        console.log(chalk.gray('Current Session:'), r.getCurrentSession());
        console.log(chalk.gray('Available Profiles:'), stats.profiles.totalProfiles);
        console.log(chalk.gray('Total Conversations:'), stats.conversations.totalConversations);
        console.log('');

        // Test providers
        console.log(chalk.cyan('🔧 Provider Status:'));
        const providerResults = await r.testProviders();

        Object.entries(providerResults).forEach(([name, result]) => {
            const status = result.status === 'available'
                ? chalk.green('✅ Available')
                : chalk.red('❌ Unavailable');
            console.log(`  ${name}: ${status}`);

            if (result.error) {
                console.log(chalk.gray(`    Error: ${result.error}`));
            }
        });

        console.log('');
        console.log(chalk.blue('📈 Profile Statistics:'));
        console.log(chalk.gray('Average Stages per Profile:'), stats.profiles.averageStages);
        console.log(chalk.gray('Model Providers:'), stats.profiles.modelProviders.join(', '));
    });

/**
 * Validate profile configuration
 */
program
    .command('validate')
    .description('Validate agent profile configurations')
    .argument('[role]', 'Specific role to validate (validates all if not specified)')
    .action(async (role) => {
        const r = await initializeRouter();

        const rolesToValidate = role ? [role] : r.getAvailableRoles();

        console.log(chalk.blue(`🔍 Validating ${rolesToValidate.length} profile(s)...`));
        console.log('');

        let totalErrors = 0;
        let totalWarnings = 0;

        rolesToValidate.forEach(roleToValidate => {
            const validation = r.validateProfile(roleToValidate);

            const status = validation.valid ? chalk.green('✅ Valid') : chalk.red('❌ Invalid');
            console.log(`${status} ${roleToValidate}`);

            if (validation.errors.length > 0) {
                validation.errors.forEach(error => {
                    console.log(chalk.red(`  ❌ Error: ${error}`));
                });
                totalErrors += validation.errors.length;
            }

            if (validation.warnings.length > 0) {
                validation.warnings.forEach(warning => {
                    console.log(chalk.yellow(`  ⚠️  Warning: ${warning}`));
                });
                totalWarnings += validation.warnings.length;
            }

            console.log('');
        });

        console.log(chalk.blue('📊 Validation Summary:'));
        console.log(chalk.gray('Total Errors:'), totalErrors);
        console.log(chalk.gray('Total Warnings:'), totalWarnings);

        if (totalErrors > 0) {
            process.exit(1);
        }
    });

/**
 * Workflow command - Bob's implementation of Tony's multi-agent orchestration
 */
program
    .command('workflow')
    .description('Execute multi-agent workflows (Tony\'s vision implemented)')
    .argument('[workflow-type]', 'Workflow pattern to execute')
    .argument('[target]', 'Target system or feature for the workflow')
    .option('--list', 'List available workflow patterns')
    .option('--status <id>', 'Check workflow status by ID')
    .action(async (workflowType, target, options) => {
        try {
            const { WorkflowCLI } = await import('./scripts/workflow-cli.js');
            const cli = new WorkflowCLI();

            const args = [];

            if (options.list) {
                args.push('list');
            } else if (options.status) {
                args.push('status', options.status);
            } else if (workflowType && target) {
                args.push(workflowType, target);
            } else if (workflowType) {
                args.push(workflowType);
            }

            await cli.run(args);

        } catch (error) {
            console.error(chalk.red('❌ Workflow command failed:'), error.message);
            process.exit(1);
        }
    });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error(chalk.red('❌ Unhandled Promise Rejection:'), reason);
    process.exit(1);
});

// Parse command line arguments
program.parse();