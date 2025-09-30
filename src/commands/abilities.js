/**
 * Abilities management commands
 * Provides CLI interface for managing and searching agent abilities
 */

import chalk from 'chalk';
import { getAgentAbilities } from '../core/abilities.js';
import { getAllRoles } from '../agents/agent-profiles.js';

export const abilitiesCommands = {
    /**
     * List all available abilities for specific roles
     */
    async list(roles = []) {
        console.log(chalk.blue('📚 Agent Abilities System'));

        const abilities = await getAgentAbilities();
        const summary = await abilities.getAbilitiesSummary(roles);

        if (summary.totalAbilities === 0) {
            console.log(chalk.yellow('No abilities found. Run initialization to create default abilities.'));
            return;
        }

        console.log(chalk.green(`\n✅ Found ${summary.totalAbilities} abilities across ${summary.totalRoles} roles\n`));

        for (const [role, roleSummary] of Object.entries(summary.rolesSummary)) {
            console.log(chalk.bold(`${role.toUpperCase()} (${roleSummary.count} files)`));
            roleSummary.files.forEach(filename => {
                console.log(`  📄 ${filename}`);
            });
            console.log(chalk.gray(`  Total size: ${Math.round(roleSummary.totalSize / 1024)}KB\n`));
        }
    },

    /**
     * Search abilities across roles
     */
    async search(query, roles = [], limit = 10) {
        console.log(chalk.blue(`🔍 Searching abilities for: "${query}"`));

        if (roles.length > 0) {
            console.log(chalk.gray(`Scope: ${roles.join(', ')}`));
        }

        const abilities = await getAgentAbilities();
        const results = await abilities.searchAbilities(query, roles, limit);

        if (results.length === 0) {
            console.log(chalk.yellow('No relevant abilities found.'));
            return;
        }

        console.log(chalk.green(`\n✅ Found ${results.length} relevant abilities:\n`));

        results.forEach((result, index) => {
            const relevancePercent = Math.round(result.relevance * 100);
            console.log(chalk.bold(`${index + 1}. ${result.filename} (${result.role})`));
            console.log(chalk.cyan(`   Relevance: ${relevancePercent}%`));
            console.log(chalk.gray(`   Preview: ${result.preview}\n`));
        });
    },

    /**
     * Show detailed ability content
     */
    async show(role, filename = null) {
        console.log(chalk.blue(`📖 Abilities for ${role} role`));

        const abilities = await getAgentAbilities();
        const roleAbilities = await abilities.loadAbilities([role]);
        const targetAbilities = roleAbilities[role] || [];

        if (targetAbilities.length === 0) {
            console.log(chalk.yellow(`No abilities found for role: ${role}`));
            return;
        }

        if (filename) {
            // Show specific file
            const ability = targetAbilities.find(a => a.filename === filename);
            if (!ability) {
                console.log(chalk.yellow(`Ability file not found: ${filename}`));
                return;
            }

            console.log(chalk.bold(`\n${ability.filename}.md`));
            console.log(chalk.gray(`Source: ${ability.source}`));
            console.log(chalk.gray(`Size: ${Math.round(ability.size / 1024)}KB\n`));
            console.log(ability.content);
        } else {
            // Show all files for the role
            console.log(chalk.green(`\n✅ Found ${targetAbilities.length} ability files:\n`));

            targetAbilities.forEach((ability, index) => {
                console.log(chalk.bold(`${index + 1}. ${ability.filename}`));
                console.log(chalk.gray(`   Size: ${Math.round(ability.size / 1024)}KB`));
                console.log(chalk.gray(`   Source: ${ability.source}`));

                // Show first few lines as preview
                const lines = ability.content.split('\n').slice(0, 5);
                console.log(chalk.cyan('   Preview:'));
                lines.forEach(line => {
                    console.log(chalk.gray(`     ${line}`));
                });
                console.log('');
            });
        }
    },

    /**
     * Initialize abilities system with default files
     */
    async init() {
        console.log(chalk.blue('🔧 Initializing abilities system...'));

        const abilities = await getAgentAbilities();
        await abilities.refreshCache();

        console.log(chalk.green('✅ Abilities system initialized and cache refreshed'));

        // Show summary
        await this.list();
    },

    /**
     * Validate abilities files
     */
    async validate() {
        console.log(chalk.blue('🔍 Validating abilities files...'));

        const abilities = await getAgentAbilities();
        const allRoles = ['global', ...getAllRoles()];

        let totalFiles = 0;
        let validFiles = 0;
        const issues = [];

        for (const role of allRoles) {
            try {
                const roleAbilities = await abilities.loadAbilities([role]);
                const targetAbilities = roleAbilities[role] || [];

                totalFiles += targetAbilities.length;

                for (const ability of targetAbilities) {
                    if (ability.content && ability.content.trim().length > 0) {
                        validFiles++;
                    } else {
                        issues.push(`${role}/${ability.filename}: Empty or invalid content`);
                    }
                }
            } catch (error) {
                issues.push(`${role}: Failed to load - ${error.message}`);
            }
        }

        console.log(chalk.green(`\n✅ Validation complete:`));
        console.log(`   Total files: ${totalFiles}`);
        console.log(`   Valid files: ${validFiles}`);
        console.log(`   Issues: ${issues.length}`);

        if (issues.length > 0) {
            console.log(chalk.yellow('\n⚠️  Issues found:'));
            issues.forEach(issue => {
                console.log(chalk.red(`   ❌ ${issue}`));
            });
        }
    }
};
