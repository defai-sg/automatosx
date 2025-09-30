#!/usr/bin/env node

/*
 * Dynamic Role Initialization System for AutomatosX
 * Addresses static mapping issues by dynamically loading and generating role configurations
 *
 * This script solves the problem of hardcoded agent mappings by:
 * 1. Scanning src/agents/profile.yaml to find all available roles
 * 2. Regenerating JavaScript mappings dynamically
 * 3. Ensuring consistency across all layers
 * 4. Providing hooks for role addition/removal without code changes
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

class DynamicRoleInitializer {
    constructor() {
        this.projectRoot = projectRoot;
        this.agentProfilesFile = path.join(projectRoot, 'src/agents/agent-profiles.js');
        this.baseAgentsRoot = path.join(projectRoot, 'src/agents');
        this.userAgentsRoot = path.join(projectRoot, '.defai/agents');
        this.validationScript = path.join(projectRoot, 'src/scripts/validate-architecture.js');

        this.roles = [];
        this.statistics = {
            rolesFound: 0,
            filesGenerated: 0,
            directoriesCreated: 0,
            errors: 0
        };
    }

    async init(command = 'full') {
        console.log(chalk.blue('🚀 AutomatosX Dynamic Role Initialization'));
        console.log(chalk.blue('=' .repeat(50)));

        try {
            switch (command) {
                case 'full':
                    await this.fullInitialization();
                    break;
                case 'profiles':
                    await this.reloadProfiles();
                    break;
                case 'abilities':
                    await this.syncAbilities();
                    break;
                case 'personalities':
                    await this.regeneratePersonalities();
                    break;
                case 'providers':
                    await this.syncProviders();
                    break;
                case 'validate':
                    await this.validateSystem();
                    break;
                case 'test':
                    await this.testSystem();
                    break;
                case 'status':
                    await this.showStatus();
                    break;
                case 'generate':
                    await this.generateMissingFiles();
                    break;
                case 'sync':
                    await this.syncAllLayers();
                    break;
                case 'reset':
                    await this.resetAndRebuild();
                    break;
                default:
                    console.log(chalk.yellow(`Unknown command: ${command}`));
                    this.showHelp();
            }

            this.showStatistics();

        } catch (error) {
            console.error(chalk.red('❌ Initialization failed:'), error.message);
            this.statistics.errors++;
        }
    }

    async scanRoles() {
        console.log(chalk.cyan('📁 Scanning for role definitions...'));

        const roleMap = new Map();

        const collectRoles = async (rootPath, sourceLabel) => {
            if (!await fs.pathExists(rootPath)) return;
            const entries = await fs.readdir(rootPath);

            for (const entry of entries) {
                if (entry.startsWith('_') || entry.endsWith('.js')) continue;
                const entryPath = path.join(rootPath, entry);

                try {
                    const stats = await fs.stat(entryPath);
                    if (!stats.isDirectory()) continue;

                    const profilePath = path.join(entryPath, 'profile.yaml');
                    if (!await fs.pathExists(profilePath)) continue;

                    const content = await fs.readFile(profilePath, 'utf8');
                    const profile = yaml.parse(content) || {};

                    if (!roleMap.has(entry) || sourceLabel === 'user') {
                        roleMap.set(entry, {
                            name: entry,
                            displayName: profile.name || entry,
                            title: profile.title || 'AI Agent',
                            description: profile.description || '',
                            personality: profile.personality || {},
                            stages: profile.stages || [],
                            memory: profile.memory || {},
                            profilePath,
                            source: sourceLabel
                        });
                    }

                } catch (error) {
                    console.warn(chalk.yellow(`⚠️  Could not parse profile for ${entry}: ${error.message}`));
                    this.statistics.errors++;
                }
            }
        };

        await collectRoles(this.baseAgentsRoot, 'base');
        await collectRoles(this.userAgentsRoot, 'user');

        this.roles = Array.from(roleMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        this.statistics.rolesFound = this.roles.length;
        console.log(chalk.green(`✅ Found ${this.roles.length} roles`));

        return this.roles;
    }

    async regeneratePersonalities() {
        console.log(chalk.cyan('🎭 Regenerating agent personalities...'));

        await this.scanRoles();

        const personalities = {};

        for (const role of this.roles) {
            personalities[role.displayName] = {
                role: role.name,
                name: role.displayName,
                title: role.title,
                personality: role.personality.traits || 'professional, helpful, knowledgeable',
                communication_style: role.personality.communication_style || 'clear_and_direct',
                decision_making: role.personality.decision_making || 'analytical_and_systematic',
                specializations: role.personality.specializations || [role.title + ' expertise'],
                catchphrase: role.personality.catchphrase || 'Excellence through systematic approach.',
                thinking_patterns: [
                    'Focus on best practices and proven methodologies',
                    'Consider scalability and maintainability',
                    'Prioritize user experience and business value'
                ]
            };
        }

        const jsContent = `/**
 * Agent Profiles - Dynamically Generated
 * Generated by Dynamic Role Initializer
 * Last updated: ${new Date().toISOString()}
 */

export const AGENT_PROFILES = ${JSON.stringify(personalities, null, 4)};

export function buildAgentPrompt(agentName, task, basePrompt) {
    const agent = AGENT_PROFILES[agentName];
    if (!agent) {
        return basePrompt;
    }

    const agentContext = \`
You are \${agent.name}, a \${agent.title}.

**Your Personality**: \${agent.personality}
**Your Specializations**: \${agent.specializations.join(', ')}
**Your Working Style**: thorough documentation, test-driven development
**Your Catchphrase**: "\${agent.catchphrase}"

**Task**: \${task}

\${basePrompt}
\`;

    return agentContext;
}

export function getAgentByRole(role) {
    return Object.values(AGENT_PROFILES).find(agent => agent.role === role);
}

export function buildEnhancedAgentPrompt(agentName, task, basePrompt) {
    return buildAgentPrompt(agentName, task, basePrompt);
}

// Dynamic role mapping - auto-generated
export const ROLE_MAPPINGS = {
${this.roles.map(role => `    '${role.name}': '${role.displayName}'`).join(',\n')}
};

export function getAllRoles() {
    return Object.keys(ROLE_MAPPINGS);
}

export function getRoleDisplayName(role) {
    return ROLE_MAPPINGS[role] || role;
}
`;

        await fs.writeFile(this.agentProfilesFile, jsContent);
        this.statistics.filesGenerated++;

        console.log(chalk.green('✅ Agent personalities regenerated'));
    }

    async syncAbilities() {
        console.log(chalk.cyan('📚 Synchronizing abilities...'));

        await this.scanRoles();

        // Ensure abilities directory exists
        await fs.ensureDir(this.baseAgentsRoot);

        // Create abilities for each role
        for (const role of this.roles) {
            const roleBaseDir = path.join(this.baseAgentsRoot, role.name);
            const roleAbilitiesDir = path.join(roleBaseDir, 'abilities');
            await fs.ensureDir(roleBaseDir);
            await fs.ensureDir(roleAbilitiesDir);

            // Create core-abilities.md if it doesn't exist
            const coreAbilitiesFile = path.join(roleAbilitiesDir, 'core-abilities.md');
            if (!await fs.pathExists(coreAbilitiesFile)) {
                const template = `# ${role.title} - Core Abilities

## Primary Expertise
- ${role.title} specialization
- Domain-specific knowledge and skills
- Best practices and methodologies

## Technical Skills
- Industry standard tools and frameworks
- Modern development practices
- Performance optimization techniques

## Problem-Solving Approach
- Systematic analysis and planning
- Risk assessment and mitigation
- Quality-focused implementation

## Collaboration Style
- Clear communication and documentation
- Knowledge sharing and mentorship
- Cross-functional team coordination

---
*This file was auto-generated by Dynamic Role Initializer*
*Last updated: ${new Date().toISOString()}*
`;
                await fs.writeFile(coreAbilitiesFile, template);
                this.statistics.filesGenerated++;
            }

            this.statistics.directoriesCreated++;
        }

        console.log(chalk.green('✅ Abilities synchronized'));
    }

    async syncAllLayers() {
        console.log(chalk.cyan('🔄 Synchronizing all layers...'));

        await this.scanRoles();
        await this.regeneratePersonalities();
        await this.syncAbilities();
        await this.syncAgentsDirectory();

        console.log(chalk.green('✅ All layers synchronized'));
    }

    async syncAgentsDirectory() {
        console.log(chalk.cyan('📂 Synchronizing user agents directory (.defai/agents)...'));

        await fs.ensureDir(this.userAgentsRoot);

        for (const role of this.roles) {
            const targetDir = path.join(this.userAgentsRoot, role.name);
            await fs.ensureDir(targetDir);

            const profileTarget = path.join(targetDir, 'profile.yaml');
            if (!await fs.pathExists(profileTarget) && role.profilePath) {
                await fs.copy(role.profilePath, profileTarget, { overwrite: false, errorOnExist: false });
            }

            const baseAbilities = path.join(this.baseAgentsRoot, role.name, 'abilities');
            const targetAbilities = path.join(targetDir, 'abilities');
            if (await fs.pathExists(baseAbilities)) {
                await fs.copy(baseAbilities, targetAbilities, {
                    overwrite: false,
                    errorOnExist: false
                });
            }

            this.statistics.directoriesCreated++;
        }

        console.log(chalk.green('✅ User agents directory synchronized'));
    }

    async fullInitialization() {
        console.log(chalk.cyan('🎯 Running full initialization...'));

        await this.syncAllLayers();
        await this.validateSystem();

        console.log(chalk.green('✅ Full initialization complete'));
    }

    async validateSystem() {
        console.log(chalk.cyan('✅ Validating system...'));

        try {
            execSync(`node "${this.validationScript}"`, { stdio: 'inherit' });
            console.log(chalk.green('✅ System validation passed'));
        } catch (error) {
            console.error(chalk.red('❌ System validation failed'));
            this.statistics.errors++;
        }
    }

    async testSystem() {
        console.log(chalk.cyan('🧪 Testing system...'));

        try {
            execSync('npm run validate', { cwd: this.projectRoot, stdio: 'inherit' });
            console.log(chalk.green('✅ System tests passed'));
        } catch (error) {
            console.error(chalk.red('❌ System tests failed'));
            this.statistics.errors++;
        }
    }

    async showStatus() {
        console.log(chalk.cyan('📊 System Status'));
        console.log(chalk.cyan('-'.repeat(30)));

        await this.scanRoles();

        console.log(`Roles found: ${this.roles.length}`);
        console.log(`Base agents directory: ${await fs.pathExists(this.baseAgentsRoot) ? '✅' : '❌'}`);
        console.log(`User agents directory (.defai): ${await fs.pathExists(this.userAgentsRoot) ? '✅' : '❌'}`);
        console.log(`Agents abilities structure: ${await fs.pathExists(this.baseAgentsRoot) ? '✅' : '❌'}`);
        console.log(`Agent profiles file: ${await fs.pathExists(this.agentProfilesFile) ? '✅' : '❌'}`);

        console.log('\nAvailable roles:');
        for (const role of this.roles) {
            console.log(`  - ${role.name} (${role.displayName})`);
        }
    }

    async resetAndRebuild() {
        console.log(chalk.red('🔄 Resetting and rebuilding system...'));
        console.log(chalk.yellow('⚠️  This will remove generated files and rebuild from scratch'));

        // Backup first
        const backupDir = path.join(this.projectRoot, `backup/dynamic-init-${Date.now()}`);
        await fs.ensureDir(backupDir);

        if (await fs.pathExists(this.agentProfilesFile)) {
            await fs.copy(this.agentProfilesFile, path.join(backupDir, 'agent-profiles.js'));
        }

        console.log(`📦 Backup created at: ${backupDir}`);

        await this.fullInitialization();

        console.log(chalk.green('✅ Reset and rebuild complete'));
    }

    showStatistics() {
        console.log(chalk.blue('\n📈 Statistics'));
        console.log(chalk.blue('-'.repeat(20)));
        console.log(`Roles found: ${this.statistics.rolesFound}`);
        console.log(`Files generated: ${this.statistics.filesGenerated}`);
        console.log(`Directories created: ${this.statistics.directoriesCreated}`);
        console.log(`Errors: ${this.statistics.errors}`);

        if (this.statistics.errors === 0) {
            console.log(chalk.green('\n🎉 All operations completed successfully!'));
        } else {
            console.log(chalk.yellow(`\n⚠️  Completed with ${this.statistics.errors} errors`));
        }
    }

    showHelp() {
        console.log(chalk.blue('\n📖 Available Commands:'));
        console.log('  full       - Complete initialization');
        console.log('  profiles   - Reload agent profiles');
        console.log('  abilities  - Sync abilities');
        console.log('  personalities - Regenerate personalities');
        console.log('  providers  - Sync providers');
        console.log('  validate   - Validate system');
        console.log('  test       - Run system tests');
        console.log('  status     - Show current status');
        console.log('  generate   - Generate missing files');
        console.log('  sync       - Sync all layers');
        console.log('  reset      - Reset and rebuild');
    }
}

// Main execution
const command = process.argv[2] || 'full';
const initializer = new DynamicRoleInitializer();
initializer.init(command);
