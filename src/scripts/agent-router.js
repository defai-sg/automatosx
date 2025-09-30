#!/usr/bin/env node

/**
 * AutomatosX Agent Router
 * Dynamic agent routing with secure execution
 *
 * Copyright 2025 DEFAI Team
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'path';
import chalk from 'chalk';
import { BaseRouter } from './utils/base-router.js';
import { DefaiError } from './utils/security-utils.js';
import { globalRoleLoader } from './utils/dynamic-role-loader.js';

/**
 * Agent Router with dynamic loading
 */
class AgentRouter extends BaseRouter {
    constructor() {
        super('agent', {
            workspaceBase: path.join(process.cwd(), '.defai', 'workspaces'),
            taskHistoryLimit: 100,
            enablePerformanceTracking: true,
            enableCaching: true
        });

        this.roleLoader = globalRoleLoader;
    }

    /**
     * Load agent personalities dynamically
     * @param {boolean} forceReload - Force reload bypassing cache
     * @returns {Object} - Agent personalities
     */
    async loadAgentPersonalities(forceReload = false) {
        const roles = await this.roleLoader.loadRoles(forceReload);

        // Create agent mapping based on actual data
        const personalities = {};

        Object.entries(roles).forEach(([roleKey, roleData]) => {
            // Use role key as the agent identifier
            personalities[roleKey] = {
                ...roleData,
                agentKey: roleKey
            };
        });

        return personalities;
    }

    /**
     * Generate agent-specific task content
     */
    generateTaskContent(task, agentConfig, metadata) {
        const timestamp = new Date().toISOString();

        return `# ${agentConfig?.name || agentConfig?.title || metadata.targetName}'s Task: ${task}

## Agent Information
- **Name**: ${agentConfig?.name || 'Professional'}
- **Role**: ${agentConfig?.role || metadata.targetName}
- **Title**: ${agentConfig?.title || `${metadata.targetName} specialist`}
- **Category**: ${agentConfig?.category || 'technical'}
- **Approach**: ${agentConfig?.style || agentConfig?.approach || 'professional approach'}
- **Specialties**: ${(agentConfig?.specialties || agentConfig?.specializations || ['General assistance']).join(', ')}

## Task Details
**Timestamp**: ${timestamp}
**Task**: ${task}
**Operation ID**: ${metadata.operationId}
**Agent**: ${metadata.targetName}

## Agent's Approach

${agentConfig?.catchphrase ? `**"${agentConfig?.catchphrase}"**

` : ''}This task will be approached using ${agentConfig?.style || agentConfig?.approach || 'a professional methodology'}.

Key focus areas:
${(agentConfig?.specialties || agentConfig?.specializations || ['Professional execution']).map(spec => `- ${spec}`).join('\n')}

${agentConfig?.thinking_patterns ? `
## Thinking Patterns
${agentConfig?.thinking_patterns.map(pattern => `- ${pattern}`).join('\n')}
` : ''}

## Expected Deliverables

This task will be processed through AutomatosX's dynamic agent system with the following capabilities:

- ✅ Dynamic role loading from authoritative sources
- ✅ Secure input validation and sanitization
- ✅ Performance tracking and monitoring
- ✅ Workspace isolation and management
- ✅ Complete task history and artifacts

The results will be saved in this agent's dedicated workspace for future reference.

## Status
🔄 **Ready for Agent Processing**

The task has been securely logged and is ready for processing with ${agentConfig?.name || metadata.targetName}'s specialized expertise.
`;
    }

    /**
     * Display agents by category
     */
    displayTargetsByCategory(configMap) {
        const categories = {
            development: '🔧 **Development Team:**',
            security: '🔒 **Security Team:**',
            creative: '🎨 **Creative Team:**',
            leadership: '👔 **Leadership Team:**',
            research: '📚 **Research Team:**',
            data: '📊 **Data Team:**',
            technical: '⚙️ **Technical Team:**',
            general: '🌟 **General Team:**'
        };

        Object.entries(categories).forEach(([categoryKey, categoryTitle]) => {
            const agentsInCategory = Object.entries(configMap)
                .filter(([_, config]) => (config.category || 'general') === categoryKey);

            if (agentsInCategory.length > 0) {
                console.log(`\n${categoryTitle}`);
                agentsInCategory.forEach(([agentKey, config]) => {
                    const name = config?.name || config?.title || agentKey;
                    const title = config.title || `${agentKey} specialist`;
                    console.log(`  • ${agentKey.padEnd(12)} - ${name} (${title})`);
                    if (config.catchphrase) {
                        console.log(`    "${config.catchphrase}"`);
                    }
                });
            }
        });
    }

    /**
     * Display usage information
     */
    displayUsage(configMap) {
        console.log('🎭 **AutomatosX Agent System**\n');
        console.log('📝 **Usage Format:**');
        console.log('  /ax:agent [agent_name], [task_description]');
        console.log('  node agent-router.js <agent_name> <task>\n');

        console.log('💡 **Usage Examples:**');
        console.log('  /ax:agent backend, Implement JWT user authentication system');
        console.log('  /ax:agent frontend, Build responsive navigation menu');
        console.log('  /ax:agent security, Perform security audit check');
        console.log('  /ax:agent design, Design user registration flow\n');

        console.log(`👥 **Available ${Object.keys(configMap).length} Professional Agents:**`);

        this.displayTargetsByCategory(configMap);

        console.log('\n🚀 **System Features:**');
        console.log('✅ Dynamic agent loading and synchronization');
        console.log('✅ Secure input validation and sanitization');
        console.log('✅ Performance tracking and monitoring');
        console.log('✅ Complete workspace management');
        console.log('✅ Task history and artifact preservation');

        console.log('\n✨ **Choose the most suitable agent for professional AI assistance!**\n');
    }
}

async function main() {
    try {
        const router = new AgentRouter();
        const args = process.argv.slice(2);

        // Special commands
        if (args.length > 0) {
            if (args[0] === '--validate-sync') {
                const report = await router.roleLoader.validateSynchronization();
                console.log(chalk.blue('🔍 Role Synchronization Report\n'));
                console.log(JSON.stringify(report, null, 2));
                process.exit(0);
            }

            if (args[0] === '--reload-cache') {
                router.roleLoader.clearCache();
                const reloaded = await router.loadAgentPersonalities(true);
                console.log(chalk.green('✅ Agent cache reloaded'));
                console.log(chalk.gray(`Found ${Object.keys(reloaded).length} agents`));
                process.exit(0);
            }

            if (args[0] === '--list-agents') {
                const personalities = await router.loadAgentPersonalities();
                console.log(chalk.blue('📋 Available Agents:\n'));
                Object.keys(personalities).sort().forEach(agent => {
                    const config = personalities[agent];
                    console.log(`• ${agent} - ${config?.name || config?.title || agent}`);
                });
                process.exit(0);
            }
        }

        // Load agent personalities
        const agentPersonalities = await router.loadAgentPersonalities();

        // Display usage if no arguments
        if (args.length === 0) {
            router.displayUsage(agentPersonalities);
            process.exit(1);
        }

        // Execute routing
        const result = await router.execute(args, agentPersonalities);

        // Display result
        router.displayResult(result, agentPersonalities[result.targetName]);

    } catch (error) {
        if (error instanceof DefaiError) {
            console.error(chalk.red('❌ Error:'), error.message);

            if (error.code === 'UNKNOWN_TARGET') {
                try {
                    const router = new AgentRouter();
                    const agentPersonalities = await router.loadAgentPersonalities();

                    console.log('\n📋 Available Agents:');
                    Object.keys(agentPersonalities).sort().forEach(name => {
                        const personality = agentPersonalities[name];
                        const displayName = personality?.name || personality?.title || name;
                        console.log(`• ${name} - ${displayName}`);
                    });
                } catch (loadError) {
                    console.log('\n📋 Unable to load agent list');
                    console.error(chalk.gray('Loading error:'), loadError.message);
                }
            }

            if (error.context && Object.keys(error.context).length > 0) {
                console.error(chalk.gray('Details:'), JSON.stringify(error.context, null, 2));
            }
        } else {
            console.error(chalk.red('❌ System Error:'), error.message);
        }

        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url.includes(process.argv[1]) || process.argv[1]?.includes('agent-router.js')) {
    main().catch(console.error);
}

export { AgentRouter };
