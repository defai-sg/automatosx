#!/usr/bin/env node

/**
 * AutomatosX Role Removal Utility
 * Safely removes an agent role and all associated files and configurations
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RoleRemover {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.agentsDir = path.join(projectPath, 'src', 'agents');
        this.agentProfilesPath = path.join(this.agentsDir, 'agent-profiles.js');
    }

    /**
     * Remove a role completely from the system
     */
    async removeRole(identifier, options = {}) {
        const { force = false, backup = true } = options;

        console.log(chalk.yellow(`🗑️  Removing role: ${identifier}`));

        try {
            // 1. Find and validate the role
            const roleInfo = await this.findRole(identifier);
            if (!roleInfo) {
                throw new Error(`Role '${identifier}' not found`);
            }

            const { role, name, profilePath } = roleInfo;

            console.log(chalk.gray(`Found: ${name} (${role})`));

            // 2. Create backup if requested
            if (backup) {
                await this.createBackup(role, name);
            }

            // 3. Confirm removal unless forced
            if (!force) {
                console.log(chalk.red('\n⚠️  WARNING: This will permanently remove:'));
                console.log(chalk.red(`  • Role directory: src/agents/${role}/`));
                console.log(chalk.red(`  • Profile: ${name} from agent-profiles.js`));
                console.log(chalk.red(`  • Workspace: .defai/workspaces/agents/${name.toLowerCase()}/`));
                console.log(chalk.red(`  • Workspace: .defai/workspaces/roles/${role}/`));
                console.log(chalk.yellow('\nUse --force to skip this confirmation'));
                console.log(chalk.cyan('Backup created in: backup/removed-roles/'));
                return;
            }

            // 4. Remove role directory
            await this.removeRoleDirectory(role);

            // 5. Update agent-profiles.js
            await this.updateAgentProfiles(name);

            // 6. Remove workspace directories
            await this.removeWorkspaceDirectories(role, name);

            // 7. Clean up any references
            await this.cleanupReferences(role, name);

            console.log(chalk.green(`✅ Successfully removed role: ${role} (${name})`));
            console.log(chalk.cyan(`\n📦 Backup available in: backup/removed-roles/${role}-${Date.now()}/`));

            return true;

        } catch (error) {
            console.error(chalk.red(`❌ Failed to remove role: ${error.message}`));
            throw error;
        }
    }

    /**
     * Find role by identifier (role name or agent name)
     */
    async findRole(identifier) {
        // First, check if it's a role directory
        const roleDir = path.join(this.agentsDir, identifier);
        if (await fs.pathExists(roleDir)) {
            const profilePath = path.join(roleDir, 'profile.yaml');
            if (await fs.pathExists(profilePath)) {
                // Read profile to get agent name
                const yaml = await import('yaml');
                const profileContent = await fs.readFile(profilePath, 'utf8');
                const profile = yaml.parse(profileContent);
                return {
                    role: identifier,
                    name: profile.name,
                    profilePath
                };
            }
        }

        // If not found as role, search in agent-profiles.js
        if (await fs.pathExists(this.agentProfilesPath)) {
            try {
                const module = await import(this.agentProfilesPath);
                const profiles = module.AGENT_PROFILES || {};

                // Search by agent name
                if (profiles[identifier]) {
                    return {
                        role: profiles[identifier].role,
                        name: identifier,
                        profilePath: path.join(this.agentsDir, profiles[identifier].role, 'profile.yaml')
                    };
                }

                // Search by role in profiles
                for (const [name, profile] of Object.entries(profiles)) {
                    if (profile.role === identifier) {
                        return {
                            role: identifier,
                            name: name,
                            profilePath: path.join(this.agentsDir, identifier, 'profile.yaml')
                        };
                    }
                }
            } catch (error) {
                console.warn(chalk.yellow('⚠️  Could not read agent-profiles.js'));
            }
        }

        return null;
    }

    /**
     * Create backup of role before removal
     */
    async createBackup(role, name) {
        const timestamp = Date.now();
        const backupDir = path.join(this.projectPath, 'backup', 'removed-roles', `${role}-${timestamp}`);

        await fs.ensureDir(backupDir);

        // Backup role directory
        const roleDir = path.join(this.agentsDir, role);
        if (await fs.pathExists(roleDir)) {
            await fs.copy(roleDir, path.join(backupDir, 'role-files'));
        }

        // Backup agent-profiles.js entry
        if (await fs.pathExists(this.agentProfilesPath)) {
            const module = await import(this.agentProfilesPath);
            const profiles = module.AGENT_PROFILES || {};

            if (profiles[name]) {
                await fs.outputJson(path.join(backupDir, 'agent-profile.json'), profiles[name], { spaces: 2 });
            }
        }

        // Backup workspace directories
        const workspaceDirs = [
            path.join(this.projectPath, '.defai', 'workspaces', 'agents', name.toLowerCase()),
            path.join(this.projectPath, '.defai', 'workspaces', 'roles', role)
        ];

        for (const [index, workspaceDir] of workspaceDirs.entries()) {
            if (await fs.pathExists(workspaceDir)) {
                const backupWorkspaceDir = path.join(backupDir, `workspace-${index === 0 ? 'agent' : 'role'}`);
                await fs.copy(workspaceDir, backupWorkspaceDir);
            }
        }

        // Create removal info
        const removalInfo = {
            role,
            name,
            removedAt: new Date().toISOString(),
            backupLocation: backupDir
        };

        await fs.outputJson(path.join(backupDir, 'removal-info.json'), removalInfo, { spaces: 2 });

        console.log(chalk.gray(`  💾 Created backup in: backup/removed-roles/${role}-${timestamp}/`));
    }

    /**
     * Remove role directory
     */
    async removeRoleDirectory(role) {
        const roleDir = path.join(this.agentsDir, role);

        if (await fs.pathExists(roleDir)) {
            await fs.remove(roleDir);
            console.log(chalk.gray(`  🗂️  Removed directory: src/agents/${role}/`));
        }
    }

    /**
     * Update agent-profiles.js to remove the agent
     */
    async updateAgentProfiles(name) {
        if (!await fs.pathExists(this.agentProfilesPath)) {
            console.log(chalk.yellow('⚠️  agent-profiles.js not found'));
            return;
        }

        try {
            const module = await import(this.agentProfilesPath);
            const profiles = module.AGENT_PROFILES || {};

            // Remove the agent
            if (profiles[name]) {
                delete profiles[name];

                // Regenerate the file
                const updatedContent = await this.generateAgentProfilesJS(profiles);
                await fs.writeFile(this.agentProfilesPath, updatedContent);

                console.log(chalk.gray(`  🔄 Updated agent-profiles.js (removed ${name})`));
            }
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not update agent-profiles.js: ${error.message}`));
        }
    }

    /**
     * Generate updated agent-profiles.js content
     */
    async generateAgentProfilesJS(profiles) {
        const content = `/**
 * Agent Profiles - Dynamically Generated
 * Generated by Dynamic Role Initializer
 * Last updated: ${new Date().toISOString()}
 */

export const AGENT_PROFILES = ${JSON.stringify(profiles, null, 4)};

/**
 * Get all available roles
 */
export function getAllRoles() {
    return Object.values(AGENT_PROFILES).map(profile => profile.role);
}

/**
 * Get agent by role
 */
export function getAgentByRole(role) {
    return Object.values(AGENT_PROFILES).find(profile => profile.role === role);
}

/**
 * Get agent by name
 */
export function getAgentByName(name) {
    return AGENT_PROFILES[name];
}

/**
 * List all agents with their roles
 */
export function listAgents() {
    return Object.entries(AGENT_PROFILES).map(([name, profile]) => ({
        name,
        role: profile.role,
        title: profile.title
    }));
}
`;

        return content;
    }

    /**
     * Remove workspace directories
     */
    async removeWorkspaceDirectories(role, name) {
        const workspaceDirs = [
            path.join(this.projectPath, '.defai', 'workspaces', 'agents', name.toLowerCase()),
            path.join(this.projectPath, '.defai', 'workspaces', 'roles', role)
        ];

        for (const workspaceDir of workspaceDirs) {
            if (await fs.pathExists(workspaceDir)) {
                await fs.remove(workspaceDir);
                console.log(chalk.gray(`  🏗️  Removed workspace: ${path.relative(this.projectPath, workspaceDir)}`));
            }
        }
    }

    /**
     * Clean up any other references to the role
     */
    async cleanupReferences(role, name) {
        // Check for any configuration files that might reference this role
        const configFiles = [
            'automatosx.config.yaml',
            'src/config/agent-provider-matrix.json'
        ];

        for (const configFile of configFiles) {
            const configPath = path.join(this.projectPath, configFile);
            if (await fs.pathExists(configPath)) {
                try {
                    let content = await fs.readFile(configPath, 'utf8');

                    // Check if the role/name is referenced
                    if (content.includes(role) || content.includes(name)) {
                        console.log(chalk.yellow(`⚠️  Found references to ${role}/${name} in ${configFile}`));
                        console.log(chalk.yellow(`   Please manually review and update this file`));
                    }
                } catch (error) {
                    // Ignore file read errors
                }
            }
        }
    }

    /**
     * List all removable roles
     */
    async listRoles() {
        console.log(chalk.blue('📋 Available roles for removal:\n'));

        // List from directories
        const roleDirectories = await fs.readdir(this.agentsDir);
        const roles = [];

        for (const dir of roleDirectories) {
            if (dir === 'agent-profiles.js' || dir === 'global') continue;

            const profilePath = path.join(this.agentsDir, dir, 'profile.yaml');
            if (await fs.pathExists(profilePath)) {
                try {
                    const yaml = await import('yaml');
                    const profileContent = await fs.readFile(profilePath, 'utf8');
                    const profile = yaml.parse(profileContent);

                    roles.push({
                        role: dir,
                        name: profile.name,
                        title: profile.title
                    });
                } catch (error) {
                    roles.push({
                        role: dir,
                        name: '(unknown)',
                        title: '(could not read profile)'
                    });
                }
            }
        }

        if (roles.length === 0) {
            console.log(chalk.gray('No roles found to remove.'));
            return;
        }

        console.log(chalk.cyan('Format: <role> | <name> | <title>\n'));

        roles.forEach(({ role, name, title }) => {
            console.log(`${chalk.green(role.padEnd(12))} | ${chalk.blue(name.padEnd(12))} | ${chalk.gray(title)}`);
        });

        console.log(chalk.yellow('\nUsage: node remove-role.js <role-or-name> --force'));
    }
}

/**
 * CLI interface
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help')) {
        console.log(chalk.blue('🗑️  AutomatosX Role Removal Utility\n'));
        console.log('Usage: node remove-role.js <role-or-name> [options]\n');
        console.log('Examples:');
        console.log('  node remove-role.js translator --force');
        console.log('  node remove-role.js Alex --force --no-backup');
        console.log('  node remove-role.js --list');
        console.log('\nOptions:');
        console.log('  --force       Skip confirmation and remove immediately');
        console.log('  --no-backup   Skip creating backup (dangerous!)');
        console.log('  --list        List all available roles');
        console.log('  --help        Show this help');
        return;
    }

    const remover = new RoleRemover();

    if (args.includes('--list')) {
        await remover.listRoles();
        return;
    }

    const identifier = args[0];
    if (!identifier) {
        console.error(chalk.red('❌ Missing role or agent name'));
        console.log('Use --list to see available roles');
        process.exit(1);
    }

    const options = {
        force: args.includes('--force'),
        backup: !args.includes('--no-backup')
    };

    await remover.removeRole(identifier, options);
}

// Export for use as module
export { RoleRemover };

// Run if called directly
if (process.argv[1] && (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('remove-role.js'))) {
    main().catch(console.error);
}