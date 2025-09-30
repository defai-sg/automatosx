/**
 * Agent Management Commands
 * Unified interface for managing agent profiles, abilities, and personalities
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getAgentManager } from '../core/agent-manager.js';

export const agentCommands = {
    /**
     * List all available agents with their status
     */
    async list(showDetails = false) {
        console.log(chalk.blue.bold('🤖 AutomatosX Agent Management System\n'));

        const manager = await getAgentManager();
        const agents = await manager.listAgents();

        // Group agents by status
        const statusGroups = {
            complete: agents.filter(a => a.status === 'complete'),
            ready: agents.filter(a => a.status === 'ready'),
            partial: agents.filter(a => a.status === 'partial'),
            missing: agents.filter(a => a.status === 'missing')
        };

        // Summary stats
        console.log(chalk.cyan('📊 Overview:'));
        console.log(`   Total Agents: ${agents.length}`);
        console.log(chalk.green(`   Complete: ${statusGroups.complete.length}`));
        console.log(chalk.blue(`   Ready: ${statusGroups.ready.length}`));
        console.log(chalk.yellow(`   Partial: ${statusGroups.partial.length}`));
        console.log(chalk.red(`   Missing: ${statusGroups.missing.length}`));
        console.log('');

        // List agents by status
        for (const [status, statusAgents] of Object.entries(statusGroups)) {
            if (statusAgents.length === 0) continue;

            const statusColors = {
                complete: chalk.green,
                ready: chalk.blue,
                partial: chalk.yellow,
                missing: chalk.red
            };

            const statusColor = statusColors[status];
            console.log(statusColor.bold(`${status.toUpperCase()} (${statusAgents.length}):`));

            statusAgents.forEach(agent => {
                const statusIndicator = this.getStatusIndicator(agent);
                console.log(`   ${statusIndicator} ${chalk.bold(agent.role)}`);

                if (showDetails) {
                    console.log(chalk.gray(`      Profile: ${agent.hasProfile ? '✓' : '✗'}`));
                    console.log(chalk.gray(`      Abilities: ${agent.abilityCount} files`));
                    console.log(chalk.gray(`      Personality: ${agent.hasPersonality ? '✓' : '✗'}`));
                }
            });
            console.log('');
        }

        if (!showDetails) {
            console.log(chalk.gray('Use --details flag for more information'));
        }
    },

    /**
     * Show detailed information about a specific agent
     */
    async show(role) {
        if (!role) {
            console.log(chalk.red('❌ Please specify an agent role'));
            return;
        }

        console.log(chalk.blue(`🤖 Agent: ${chalk.bold(role.toUpperCase())}\n`));

        const manager = await getAgentManager();
        const info = await manager.getAgentInfo(role);

        if (!info.profile && info.abilities.length === 0 && !info.personality) {
            console.log(chalk.red(`❌ Agent '${role}' not found or not configured`));
            return;
        }

        // Agent Status
        const validation = await manager.validateAgent(role);
        const statusColor = {
            complete: chalk.green,
            ready: chalk.blue,
            partial: chalk.yellow,
            missing: chalk.red
        }[validation.status];

        console.log(statusColor(`📊 Status: ${validation.status.toUpperCase()}`));
        console.log('');

        // Personality
        if (info.personality) {
            console.log(chalk.cyan('👤 Personality:'));
            console.log(`   Name: ${chalk.bold(info.personality.name)}`);
            console.log(`   Title: ${info.personality.title}`);
            console.log(`   Style: ${info.personality.personality}`);
            console.log(`   Catchphrase: "${info.personality.catchphrase}"`);
            console.log(`   Specializations: ${info.personality.specializations.join(', ')}`);
            console.log('');
        }

        // Profile
        if (info.profile) {
            console.log(chalk.cyan('⚙️  Profile Configuration:'));
            console.log(`   Description: ${info.profile.description}`);
            if (info.profile.stages) {
                console.log(`   Workflow: ${info.profile.stages.join(' → ')}`);
            }
            console.log('');
        }

        // Abilities
        if (info.abilities.length > 0) {
            console.log(chalk.cyan(`📚 Abilities (${info.abilities.length} files):`));
            info.abilities.forEach((ability, index) => {
                console.log(`   ${index + 1}. ${chalk.bold(ability.filename)}`);
                console.log(chalk.gray(`      Size: ${Math.round(ability.size / 1024)}KB`));
                console.log(chalk.gray(`      File: ${path.basename(ability.source)}`));
            });
            console.log('');
        }

        // File locations
        console.log(chalk.cyan('📁 File Locations:'));
        if (info.files.profile) {
            console.log(`   Profile: ${chalk.underline(info.files.profile)}`);
        }
        console.log(`   Personality: ${chalk.underline(info.files.personality)}`);
        info.files.abilities.forEach(file => {
            console.log(`   Ability: ${chalk.underline(file)}`);
        });
        console.log('');

        // Issues and suggestions
        if (validation.issues.length > 0) {
            console.log(chalk.red('⚠️  Issues:'));
            validation.issues.forEach(issue => {
                console.log(chalk.red(`   ❌ ${issue}`));
            });
            console.log('');
        }

        if (validation.suggestions.length > 0) {
            console.log(chalk.yellow('💡 Suggestions:'));
            validation.suggestions.forEach(suggestion => {
                console.log(chalk.yellow(`   💡 ${suggestion}`));
            });
        }
    },

    /**
     * Show file locations for direct editing
     */
    async files(role) {
        if (!role) {
            console.log(chalk.red('❌ Please specify an agent role'));
            return;
        }

        console.log(chalk.blue(`📁 ${chalk.bold(role.toUpperCase())} Agent Files\n`));

        const manager = await getAgentManager();

        try {
            const fileInfo = await manager.getAgentFiles(role);

            console.log(chalk.cyan('📄 Configuration Files:'));
            if (fileInfo.files.profile) {
                console.log(chalk.green(`   Profile: ${fileInfo.files.profile}`));
            } else {
                console.log(chalk.red('   Profile: Not found'));
            }

            console.log(chalk.green(`   Personality: ${fileInfo.files.personality}`));

            console.log(chalk.cyan('\n📚 Ability Files:'));
            if (fileInfo.files.abilities.length > 0) {
                fileInfo.files.abilities.forEach((file, index) => {
                    console.log(chalk.green(`   ${index + 1}. ${file}`));
                });
            } else {
                console.log(chalk.red('   No ability files found'));
            }

            console.log(chalk.yellow('\n💡 Usage:'));
            console.log('   • Edit files directly with your preferred editor');
            console.log('   • Changes take effect immediately');
            console.log('   • Use validation command to check configuration');

        } catch (error) {
            console.log(chalk.red(`❌ Failed to get file locations: ${error.message}`));
        }
    },

    /**
     * Search across all agents
     */
    async search(query, includeAbilities = true) {
        if (!query) {
            console.log(chalk.red('❌ Please provide a search query'));
            return;
        }

        console.log(chalk.blue(`🔍 Searching agents for: "${query}"\n`));

        const manager = await getAgentManager();
        const results = await manager.searchAgents(query, includeAbilities);

        if (results.length === 0) {
            console.log(chalk.yellow('No matching agents found.'));
            return;
        }

        console.log(chalk.green(`✅ Found ${results.length} matching agents:\n`));

        results.forEach((result, index) => {
            const relevancePercent = Math.round(result.relevance * 100);
            console.log(chalk.bold(`${index + 1}. ${result.role.toUpperCase()}`));
            console.log(chalk.cyan(`   Relevance: ${relevancePercent}%`));
            console.log(chalk.gray(`   Matches: ${result.matches.join(', ')}`));

            if (result.info.personality) {
                console.log(chalk.gray(`   ${result.info.personality.name} - ${result.info.personality.title}`));
            }
            console.log('');
        });
    },

    /**
     * Validate all agents or a specific agent
     */
    async validate(role = null) {
        const manager = await getAgentManager();

        if (role) {
            // Validate specific agent
            console.log(chalk.blue(`🔍 Validating ${chalk.bold(role)} agent...\n`));

            const validation = await manager.validateAgent(role);

            const statusColor = {
                complete: chalk.green,
                ready: chalk.blue,
                partial: chalk.yellow,
                missing: chalk.red
            }[validation.status];

            console.log(statusColor(`Status: ${validation.status.toUpperCase()}`));

            if (validation.issues.length > 0) {
                console.log(chalk.red('\n❌ Issues:'));
                validation.issues.forEach(issue => {
                    console.log(chalk.red(`   • ${issue}`));
                });
            }

            if (validation.suggestions.length > 0) {
                console.log(chalk.yellow('\n💡 Suggestions:'));
                validation.suggestions.forEach(suggestion => {
                    console.log(chalk.yellow(`   • ${suggestion}`));
                });
            }

            if (validation.issues.length === 0) {
                console.log(chalk.green('\n✅ No issues found!'));
            }

        } else {
            // Validate all agents
            console.log(chalk.blue('🔍 Validating all agents...\n'));

            const agents = await manager.listAgents();
            const validationResults = [];

            for (const agent of agents) {
                const validation = await manager.validateAgent(agent.role);
                validationResults.push(validation);
            }

            // Summary
            const summary = {
                complete: validationResults.filter(v => v.status === 'complete').length,
                ready: validationResults.filter(v => v.status === 'ready').length,
                partial: validationResults.filter(v => v.status === 'partial').length,
                missing: validationResults.filter(v => v.status === 'missing').length,
                totalIssues: validationResults.reduce((sum, v) => sum + v.issues.length, 0)
            };

            console.log(chalk.cyan('📊 Validation Summary:'));
            console.log(chalk.green(`   Complete: ${summary.complete}`));
            console.log(chalk.blue(`   Ready: ${summary.ready}`));
            console.log(chalk.yellow(`   Partial: ${summary.partial}`));
            console.log(chalk.red(`   Missing: ${summary.missing}`));
            console.log(chalk.red(`   Total Issues: ${summary.totalIssues}`));

            // Show agents with issues
            const agentsWithIssues = validationResults.filter(v => v.issues.length > 0);
            if (agentsWithIssues.length > 0) {
                console.log(chalk.red('\n⚠️  Agents with issues:'));
                agentsWithIssues.forEach(validation => {
                    console.log(chalk.red(`   ${validation.role}: ${validation.issues.length} issues`));
                });
            }
        }
    },

    /**
     * Generate comprehensive documentation for an agent
     */
    async docs(role, outputFile = null) {
        if (!role) {
            console.log(chalk.red('❌ Please specify an agent role'));
            return;
        }

        console.log(chalk.blue(`📖 Generating documentation for ${chalk.bold(role)} agent...`));

        const manager = await getAgentManager();
        const guide = await manager.generateAgentGuide(role);

        if (outputFile) {
            await fs.writeFile(outputFile, guide);
            console.log(chalk.green(`✅ Documentation saved to: ${chalk.underline(outputFile)}`));
        } else {
            console.log('\n' + guide);
        }
    },

    /**
     * Get status indicator for display
     */
    getStatusIndicator(agent) {
        const indicators = {
            complete: chalk.green('●'),
            ready: chalk.blue('●'),
            partial: chalk.yellow('●'),
            missing: chalk.red('●')
        };
        return indicators[agent.status] || chalk.gray('●');
    }
};