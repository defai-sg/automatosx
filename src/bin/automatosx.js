#!/usr/bin/env node

/**
 * AutomatosX v3.1.5 CLI Tool
 * Enhanced AI agent orchestration with multi-provider routing and CLI-first architecture
 *
 * Copyright 2025 DEFAI Limited (https://defai.digital/)
 * Licensed under the MIT License
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic agent and role discovery
async function discoverAgentsAndRoles(verbose = false) {
    const profilesDir = path.join(PACKAGE_ROOT, 'profiles');
    const agentProfilesPath = path.join(PACKAGE_ROOT, 'src/agents/agent-profiles.js');

    let agents = [];
    let roles = [];

    try {
        // Discover roles from profiles directory
        if (await fs.pathExists(profilesDir)) {
            const profileFiles = await fs.readdir(profilesDir);
            roles = profileFiles
                .filter(f => f.endsWith('.yaml'))
                .map(f => f.replace('.yaml', ''));

            if (verbose) {
                console.log(chalk.gray(`  Discovered ${roles.length} roles from profiles: ${roles.join(', ')}`));
            }
        }

        // Discover agent names from agent-profiles.js
        if (await fs.pathExists(agentProfilesPath)) {
            try {
                const agentProfilesModule = await import(agentProfilesPath);
                const agentProfiles = agentProfilesModule.AGENT_PROFILES || agentProfilesModule.default || agentProfilesModule.agentProfiles;
                if (agentProfiles) {
                    agents = Object.keys(agentProfiles);
                    if (verbose) {
                        console.log(chalk.gray(`  Discovered ${agents.length} agents: ${agents.join(', ')}`));
                    }
                }

                if (roles.length === 0) {
                    const getAllRoles = agentProfilesModule.getAllRoles;
                    if (typeof getAllRoles === 'function') {
                        roles = getAllRoles();
                        if (verbose) {
                            console.log(chalk.gray(`  Derived roles from agent profiles: ${roles.join(', ')}`));
                        }
                    }
                }
            } catch (error) {
                if (verbose) {
                    console.log(chalk.yellow(`  Warning: Could not load agent profiles: ${error.message}`));
                }
            }
        }

        // Fallback to default agents and roles if discovery fails
        if (agents.length === 0) {
            agents = ['Anna', 'Adrian', 'Bob', 'Eric', 'Flora', 'Tony', 'Daisy', 'Debbee', 'Oliver', 'Doris', 'Frank', 'Louis', 'Paris', 'Queenie', 'Steve', 'Maggie', 'Alex', 'Quian', 'Emily', 'Nicolas'];
            if (verbose) {
                console.log(chalk.yellow(`  Using fallback agents: ${agents.length} agents`));
            }
        }

        if (roles.length === 0) {
            roles = ['algorithm', 'analyst', 'architect', 'backend', 'ceo', 'cfo', 'cto', 'data', 'design', 'devops', 'docs', 'edge', 'frontend', 'legal', 'marketer', 'network', 'product', 'quality', 'quantum', 'security'];
            if (verbose) {
                console.log(chalk.yellow(`  Using fallback roles: ${roles.length} roles`));
            }
        }

    } catch (error) {
        if (verbose) {
            console.log(chalk.yellow(`  Warning during discovery: ${error.message}`));
        }
        // Use fallback values
        agents = ['Anna', 'Adrian', 'Bob', 'Eric', 'Flora', 'Tony', 'Daisy', 'Debbee', 'Oliver', 'Doris', 'Frank', 'Louis', 'Paris', 'Queenie', 'Steve', 'Maggie', 'Alex', 'Quian', 'Emily', 'Nicolas'];
        roles = ['algorithm', 'analyst', 'architect', 'backend', 'ceo', 'cfo', 'cto', 'data', 'design', 'devops', 'docs', 'edge', 'frontend', 'legal', 'marketer', 'network', 'product', 'quality', 'quantum', 'security'];
    }

    return { agents, roles };
}

const program = new Command();
const PACKAGE_ROOT = path.resolve(__dirname, '../..');
const VERSION = JSON.parse(await fs.readFile(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')).version;

program
    .name('automatosx')
    .description('AutomatosX v3.1.5 - Enhanced AI agent orchestration with multi-provider routing and CLI-first architecture')
    .version(VERSION);

// Default command (init)
program
    .argument('[command]', 'Command to run (defaults to init)')
    .option('-f, --force', 'Force overwrite existing files')
    .option('-v, --verbose', 'Verbose output')
    .action(async (command = 'init', options) => {
        if (command === 'init') {
            await initCommand(options);
        } else {
            console.error(chalk.red(`Unknown command: ${command}`));
            program.help();
        }
    });

// Explicit init command
program
    .command('init')
    .description('Initialize AutomatosX in current directory')
    .option('-f, --force', 'Force overwrite existing files')
    .option('-v, --verbose', 'Verbose output')
    .action(initCommand);

// Update command
program
    .command('update')
    .description('Update AutomatosX to latest version')
    .action(updateCommand);

// Status command
program
    .command('status')
    .description('Check AutomatosX installation status')
    .action(statusCommand);

// Validate command
program
    .command('validate')
    .description('Validate AutomatosX configuration and integrity')
    .option('-v, --verbose', 'Verbose output')
    .action(validateCommand);

// Run command - Execute task with agent
program
    .command('run')
    .description('Execute a task with specified agent role')
    .argument('<role>', 'Agent role (backend, frontend, ceo, research, etc.)')
    .argument('<task>', 'Task description or prompt')
    .option('-s, --stage <stage>', 'Specific workflow stage to execute')
    .option('--workflow', 'Execute full multi-stage workflow')
    .option('-v, --verbose', 'Verbose output')
    .action(runCommand);

async function initCommand(options = {}) {
    const currentDir = process.cwd();
    const { force, verbose } = options;

    console.log(chalk.blue('🚀 AutomatosX v3.1.5 Initialization\n'));

    if (verbose) {
        console.log(chalk.gray(`Package root: ${PACKAGE_ROOT}`));
        console.log(chalk.gray(`Current directory: ${currentDir}`));
    }

    // Check if already initialized
    const claudeDir = path.join(currentDir, '.claude');
    if (await fs.pathExists(claudeDir) && !force) {
        console.log(chalk.yellow('⚠️  AutomatosX already initialized in this directory.'));
        console.log(chalk.gray('Use --force to reinitialize'));
        return;
    }

    try {
        // Create directory structure
        await createDirectoryStructure(currentDir, verbose);

        // Copy template files
        await copyTemplateFiles(currentDir, verbose);

        // Copy source files
        await copySourceFiles(currentDir, verbose);

        // Initialize package.json if needed
        await initializePackageJson(currentDir, verbose);

        // Create Claude Code configuration
        await createClaudeConfig(currentDir, verbose);

        // Validate system integrity
        await validateSystemIntegrity(currentDir, verbose);

        // Success message
        console.log(chalk.green('\n✅ AutomatosX v3.1.5 successfully initialized!'));
        console.log(chalk.blue('\n🎯 Next steps:'));
        console.log(chalk.gray('1. Open your project in Claude Code'));
        console.log(chalk.gray('2. Try: /ax:help'));
        console.log(chalk.gray('3. Start with: /ax:agent bob, create a hello world function'));

    } catch (error) {
        console.error(chalk.red('\n❌ Initialization failed:'), error.message);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

async function createDirectoryStructure(targetDir, verbose = false) {
    const directories = [
        // Claude-specific directories (must remain in .claude for Claude Code integration)
        '.claude/commands/ax',
        '.defai/memory',
        '.claude/styles/ax',
        '.claude/mcp/ax',
        '.claude/metrics',

        // User application directories (moved to .defai)
        '.defai/automatosx/src/core',
        '.defai/automatosx/src/agents',
        '.defai/automatosx/src/providers',
        '.defai/automatosx/src/memory',
        '.defai/automatosx/src/utils',
        '.defai/automatosx/src/commands',
        '.defai/automatosx/config',
        '.defai/automatosx/profiles',
        '.defai/workspaces/agents',
        '.defai/workspaces/roles'
    ];

    console.log(chalk.cyan('📁 Creating directory structure...'));

    for (const dir of directories) {
        const fullPath = path.join(targetDir, dir);
        await fs.ensureDir(fullPath);
        if (verbose) {
            console.log(chalk.gray(`  Created: ${dir}`));
        }
    }

    // Dynamically discover agents and roles from profiles
    const { agents, roles } = await discoverAgentsAndRoles(verbose);

    for (const agent of agents) {
        const agentDir = path.join(targetDir, '.defai/workspaces/agents', agent);
        await fs.ensureDir(agentDir);
        for (const subdir of ['outputs', 'logs', 'tasks', 'context', 'artifacts']) {
            await fs.ensureDir(path.join(agentDir, subdir));
        }
    }

    for (const role of roles) {
        const roleDir = path.join(targetDir, '.defai/workspaces/roles', role);
        await fs.ensureDir(roleDir);
        for (const subdir of ['outputs', 'logs', 'tasks', 'context', 'artifacts']) {
            await fs.ensureDir(path.join(roleDir, subdir));
        }
    }

    console.log(chalk.green('  ✅ Directory structure created'));
}

async function copyTemplateFiles(targetDir, verbose = false) {
    console.log(chalk.cyan('📋 Copying command templates...'));

    const templatesDir = path.join(PACKAGE_ROOT, 'templates');

    if (await fs.pathExists(templatesDir)) {
        await fs.copy(templatesDir, targetDir, { overwrite: true });
        if (verbose) {
            console.log(chalk.gray('  Copied template files'));
        }
    }

    console.log(chalk.green('  ✅ Command templates copied'));
}

async function copySourceFiles(targetDir, verbose = false) {
    console.log(chalk.cyan('🔧 Copying source files...'));

    const sourceDir = path.join(PACKAGE_ROOT, 'src');

    // Copy core application files to .defai
    const targetDefaiDir = path.join(targetDir, '.defai/automatosx/src');

    if (await fs.pathExists(sourceDir)) {
        // Copy main application files to .defai
        await fs.copy(sourceDir, targetDefaiDir, {
            overwrite: true
        });

        // Copy Claude-specific Markdown command files
        const claudeCommandsSource = path.join(PACKAGE_ROOT, '.claude/commands/ax');
        const claudeCommandsTarget = path.join(targetDir, '.claude/commands/ax');

        if (await fs.pathExists(claudeCommandsSource)) {
            await fs.copy(claudeCommandsSource, claudeCommandsTarget, { overwrite: true });
            if (verbose) {
                console.log(chalk.gray('  Copied Claude command files to .claude/commands/ax/'));
            }
        }

        // Copy configuration files
        const configFiles = [
            'automatosx.config.yaml',
            'package.json'
        ];

        for (const configFile of configFiles) {
            const sourceConfig = path.join(PACKAGE_ROOT, configFile);
            const targetConfig = path.join(targetDir, '.defai/automatosx', configFile);

            if (await fs.pathExists(sourceConfig)) {
                await fs.copy(sourceConfig, targetConfig, { overwrite: true });
                if (verbose) {
                    console.log(chalk.gray(`  Copied ${configFile} to .defai/automatosx/`));
                }
            }
        }

        if (verbose) {
            console.log(chalk.gray('  Copied application files to .defai/automatosx/'));
        }
    }

    console.log(chalk.green('  ✅ Source files copied'));
}

async function initializePackageJson(targetDir, verbose = false) {
    const packageJsonPath = path.join(targetDir, 'package.json');
    let packageJson = {};

    // Read existing package.json if it exists
    if (await fs.pathExists(packageJsonPath)) {
        try {
            packageJson = await fs.readJson(packageJsonPath);
        } catch (error) {
            if (verbose) {
                console.log(chalk.yellow('  Warning: Could not read existing package.json'));
            }
        }
    }

    // Add AutomatosX dependencies if not present
    if (!packageJson.dependencies) {
        packageJson.dependencies = {};
    }

    const requiredDeps = {
        'chalk': '^5.3.0',
        'fs-extra': '^11.2.0'
    };

    let depsAdded = false;
    for (const [dep, version] of Object.entries(requiredDeps)) {
        if (!packageJson.dependencies[dep]) {
            packageJson.dependencies[dep] = version;
            depsAdded = true;
        }
    }

    // Add module type if not set
    if (!packageJson.type) {
        packageJson.type = 'module';
    }

    // Write package.json if modified
    if (depsAdded || !await fs.pathExists(packageJsonPath)) {
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        console.log(chalk.cyan('📦 Installing dependencies...'));
        try {
            await execAsync('npm install', { cwd: targetDir });
            console.log(chalk.green('  ✅ Dependencies installed in project root'));
        } catch (error) {
            console.log(chalk.yellow('  ⚠️  Please run "npm install" manually in project root'));
        }
    }

    // Also install dependencies in .defai/automatosx
    const defaiPackageJsonPath = path.join(targetDir, '.defai/automatosx/package.json');
    if (await fs.pathExists(defaiPackageJsonPath)) {
        console.log(chalk.cyan('📦 Installing AutomatosX dependencies...'));
        try {
            await execAsync('npm install', { cwd: path.join(targetDir, '.defai/automatosx') });
            console.log(chalk.green('  ✅ AutomatosX dependencies installed'));
        } catch (error) {
            console.log(chalk.yellow('  ⚠️  Please run "npm install" manually in .defai/automatosx/'));
        }
    }
}

async function updateCommand() {
    console.log(chalk.blue('🔄 Updating AutomatosX...'));

    try {
        // Update the global package
        console.log(chalk.cyan('Updating global package...'));
        await execAsync('npm update -g automatosx');

        console.log(chalk.green('✅ AutomatosX updated successfully!'));
        console.log(chalk.gray('Run "automatosx init --force" in your project to update local files'));
    } catch (error) {
        console.error(chalk.red('❌ Update failed:'), error.message);
        process.exit(1);
    }
}

async function statusCommand() {
    const currentDir = process.cwd();

    console.log(chalk.blue('📊 AutomatosX Status\n'));

    // Check global installation
    try {
        const { stdout } = await execAsync('npm list -g automatosx --depth=0');
        console.log(chalk.green('✅ Global installation: OK'));
        console.log(chalk.gray(`   ${stdout.trim()}`));
    } catch (error) {
        console.log(chalk.red('❌ Global installation: Not found'));
    }

    // Check local initialization
    const claudeDir = path.join(currentDir, '.claude');
    // Check source file locations
    const srcDir = path.join(currentDir, '.defai/automatosx/src');

    if (await fs.pathExists(claudeDir)) {
        console.log(chalk.green('✅ Local initialization: OK'));

        // Check commands
        const commandsDir = path.join(claudeDir, 'commands/ax');
        if (await fs.pathExists(commandsDir)) {
            const commands = await fs.readdir(commandsDir);
            console.log(chalk.gray(`   Commands available: ${commands.length}`));
        }

        // Check workspaces
        const workspacesDir = path.join(currentDir, 'workspaces');
        if (await fs.pathExists(workspacesDir)) {
            console.log(chalk.gray('   Workspaces: Configured'));
        }

    } else {
        console.log(chalk.yellow('⚠️  Local initialization: Not found'));
        console.log(chalk.gray('   Run "automatosx init" to initialize'));
    }

    // Check source files
    if (await fs.pathExists(srcDir)) {
        console.log(chalk.green('✅ Source files: OK'));
    } else {
        console.log(chalk.yellow('⚠️  Source files: Missing'));
    }

    // Check Claude Code CLI
    try {
        await execAsync('claude --version');
        console.log(chalk.green('✅ Claude Code CLI: Available'));
    } catch (error) {
        console.log(chalk.red('❌ Claude Code CLI: Not found'));
        console.log(chalk.gray('   Install from: https://claude.ai/code'));
    }
}

async function createClaudeConfig(targetDir, verbose = false) {
    console.log(chalk.cyan('⚙️  Creating Claude Code configuration...'));

    const configPath = path.join(targetDir, '.defai/claude-integration/config.json');
    const config = {
        "version": "2.0.0",
        "name": "AutomatosX Project",
        "description": "AI-powered development workflow with AutomatosX",
        "commands": {
            "ax:test": {
                "file": "commands/ax/test.md",
                "description": "Simple test command"
            },
            "ax:help": {
                "file": "commands/ax/help.md",
                "description": "AutomatosX help system"
            },
            "ax:agent": {
                "file": "commands/ax/agent.md",
                "description": "Agent-based command system"
            },
            "ax:backend": {
                "file": "commands/ax/backend.md",
                "description": "Backend development"
            },
            "ax:frontend": {
                "file": "commands/ax/frontend.md",
                "description": "Frontend development"
            },
            "ax:security": {
                "file": "commands/ax/security.md",
                "description": "Security assessment"
            },
            "ax:workspace": {
                "file": "commands/ax/workspace.md",
                "description": "Workspace management"
            },
            "ax:config": {
                "file": "commands/ax/config.md",
                "description": "Provider configuration management"
            }
        }
    };

    await fs.writeJson(configPath, config, { spaces: 2 });

    // Also create the test command
    const testCommandPath = path.join(targetDir, '.claude/commands/ax/test.js');
    const testCommandContent = `/**
 * /ax:test - Simple Test Command
 * Basic test to verify Claude Code integration
 */

export default {
    name: 'ax:test',
    description: 'Simple test command to verify AutomatosX is working',
    category: 'test',

    usage: ['/ax:test'],

    async execute(args, context) {
        console.log('🧪 AutomatosX Test Command Executed!');

        return {
            success: true,
            result: \`✅ AutomatosX is working correctly!

**Test Results:**
- Command execution: ✅ OK
- Arguments received: \${args.length}
- Project path: \${context?.projectPath || 'Unknown'}
- Timestamp: \${new Date().toISOString()}

🎉 All systems operational! Try:
- /ax:help
- /ax:agent bob, create a hello world function\`
        };
    }
};`;

    await fs.writeFile(testCommandPath, testCommandContent);

    if (verbose) {
        console.log(chalk.gray('  Created Claude Code configuration'));
        console.log(chalk.gray('  Created test command'));
    }

    console.log(chalk.green('  ✅ Claude Code configuration created'));
}

async function validateSystemIntegrity(targetDir, verbose = false) {
    console.log(chalk.cyan('🔍 Validating system integrity...'));

    const checks = {
        enhancedIndex: false,
        profilesDirectory: false,
        agentProfiles: false,
        providersDirectory: false,
        coreDirectory: false
    };

    try {
        // Check for index.js
        const indexPath = path.join(targetDir, '.defai/automatosx/src/index.js');
        checks.enhancedIndex = await fs.pathExists(indexPath);

        // Check profiles directory and structure
        const profilesDir = path.join(targetDir, '.defai/automatosx/profiles');
        checks.profilesDirectory = await fs.pathExists(profilesDir);

        // Check agent-profiles.js
        const agentProfilesPath = path.join(targetDir, '.defai/automatosx/src/agents/agent-profiles.js');
        checks.agentProfiles = await fs.pathExists(agentProfilesPath);

        // Check providers directory
        const providersDir = path.join(targetDir, '.defai/automatosx/src/providers');
        checks.providersDirectory = await fs.pathExists(providersDir);

        // Check core directory
        const coreDir = path.join(targetDir, '.defai/automatosx/src/core');
        checks.coreDirectory = await fs.pathExists(coreDir);

        // Report results
        for (const [check, passed] of Object.entries(checks)) {
            if (passed) {
                if (verbose) console.log(chalk.green(`  ✅ ${check}: OK`));
            } else {
                if (verbose) console.log(chalk.yellow(`  ⚠️  ${check}: Missing`));
            }
        }

        const totalChecks = Object.keys(checks).length;
        const passedChecks = Object.values(checks).filter(Boolean).length;

        if (passedChecks === totalChecks) {
            console.log(chalk.green('  ✅ System integrity validation passed'));
        } else {
            console.log(chalk.yellow(`  ⚠️  System integrity: ${passedChecks}/${totalChecks} checks passed`));
            console.log(chalk.gray('  Some components may be missing. System will use fallback configurations.'));
        }

    } catch (error) {
        console.log(chalk.yellow(`  ⚠️  System integrity validation failed: ${error.message}`));
        if (verbose) {
            console.error(error.stack);
        }
    }
}

async function validateCommand(options = {}) {
    const currentDir = process.cwd();
    const { verbose } = options;

    console.log(chalk.blue('🔍 AutomatosX Configuration Validation\n'));

    try {
        // Check if project is initialized
        const claudeDir = path.join(currentDir, '.claude');
        if (!await fs.pathExists(claudeDir)) {
            console.log(chalk.red('❌ AutomatosX not initialized in this directory'));
            console.log(chalk.gray('Run "automatosx init" to initialize'));
            return;
        }

        // Validate system integrity
        await validateSystemIntegrity(currentDir, verbose);

        // Validate profiles if they exist
        await validateProfiles(currentDir, verbose);

        // Validate CLI tools
        await validateCliTools(verbose);

        // Validate package dependencies
        await validateDependencies(currentDir, verbose);

        console.log(chalk.green('\n✅ Configuration validation completed'));

    } catch (error) {
        console.error(chalk.red('\n❌ Validation failed:'), error.message);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

async function validateProfiles(targetDir, verbose = false) {
    console.log(chalk.cyan('📋 Validating profiles...'));

    try {
        const profilesDir = path.join(targetDir, '.defai/automatosx/profiles');
        if (await fs.pathExists(profilesDir)) {
            const profileFiles = await fs.readdir(profilesDir);
            const yamlFiles = profileFiles.filter(f => f.endsWith('.yaml'));

            if (yamlFiles.length > 0) {
                console.log(chalk.green(`  ✅ Found ${yamlFiles.length} profile(s): ${yamlFiles.map(f => f.replace('.yaml', '')).join(', ')}`));
            } else {
                console.log(chalk.yellow('  ⚠️  No YAML profiles found'));
            }
        } else {
            console.log(chalk.yellow('  ⚠️  Profiles directory not found'));
        }
    } catch (error) {
        console.log(chalk.yellow(`  ⚠️  Profile validation failed: ${error.message}`));
    }
}

async function validateCliTools(verbose = false) {
    console.log(chalk.cyan('🛠️  Validating CLI tools...'));

    const tools = [
        { name: 'claude', command: 'claude --version', description: 'Claude Code CLI' },
        { name: 'openai', command: 'openai --version', description: 'OpenAI CLI' },
        { name: 'gcloud', command: 'gcloud --version', description: 'Google Cloud CLI' }
    ];

    for (const tool of tools) {
        try {
            await execAsync(tool.command);
            console.log(chalk.green(`  ✅ ${tool.description}: Available`));
        } catch (error) {
            console.log(chalk.gray(`  ⚪ ${tool.description}: Not available`));
            if (verbose) {
                console.log(chalk.gray(`    ${error.message}`));
            }
        }
    }
}

async function validateDependencies(targetDir, verbose = false) {
    console.log(chalk.cyan('📦 Validating dependencies...'));

    try {
        const packageJsonPath = path.join(targetDir, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);

            const requiredDeps = ['chalk', 'fs-extra'];
            const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);

            if (missingDeps.length === 0) {
                console.log(chalk.green('  ✅ All required dependencies present'));
            } else {
                console.log(chalk.yellow(`  ⚠️  Missing dependencies: ${missingDeps.join(', ')}`));
                console.log(chalk.gray('  Run "npm install" to install missing dependencies'));
            }

            if (packageJson.type !== 'module') {
                console.log(chalk.yellow('  ⚠️  package.json should have "type": "module" for ES modules'));
            } else {
                console.log(chalk.green('  ✅ ES module configuration correct'));
            }
        } else {
            console.log(chalk.yellow('  ⚠️  package.json not found'));
        }
    } catch (error) {
        console.log(chalk.yellow(`  ⚠️  Dependency validation failed: ${error.message}`));
    }
}

/**
 * Run command - Execute task with agent
 */
async function runCommand(role, task, options = {}) {
    const { stage, workflow, verbose } = options;
    const currentDir = process.cwd();

    try {
        if (verbose) {
            console.log(chalk.gray(`Executing agent: ${role}`));
            console.log(chalk.gray(`Task: ${task}`));
            console.log(chalk.gray(`Current directory: ${currentDir}`));
        }

        // Check if AutomatosX is installed
        const defaiDir = path.join(currentDir, '.defai', 'automatosx');
        const claudeDir = path.join(currentDir, '.claude');

        if (!await fs.pathExists(defaiDir) || !await fs.pathExists(claudeDir)) {
            console.log(chalk.red('❌ AutomatosX not found in current directory'));
            console.log(chalk.yellow('Run "automatosx init" first to initialize AutomatosX'));
            return;
        }

        // Use index.js for actual execution
        const indexPath = path.join(defaiDir, 'src', 'index.js');

        if (!await fs.pathExists(indexPath)) {
            console.log(chalk.red('❌ AutomatosX core files not found'));
            console.log(chalk.yellow('Reinstall AutomatosX or run "automatosx init"'));
            return;
        }

        console.log(chalk.blue(`🤖 Starting ${role} agent...`));

        // Build command arguments
        const args = ['run', role, task];
        if (stage) args.push('--stage', stage);
        if (workflow) args.push('--workflow');
        if (verbose) args.push('--verbose');

        // Execute the index with proper arguments
        const { stdout, stderr } = await execAsync(`node "${indexPath}" ${args.map(arg => `"${arg}"`).join(' ')}`, {
            cwd: defaiDir, // Run in the .defai/automatosx directory context
            timeout: 300000 // 5 minutes timeout
        });

        if (stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.error(chalk.yellow(stderr));
        }

    } catch (error) {
        console.error(chalk.red('❌ Agent execution failed:'), error.message);
        if (verbose && error.stack) {
            console.error(chalk.gray('Stack trace:'));
            console.error(error.stack);
        }

        // Helpful suggestions
        console.log(chalk.yellow('\n💡 Troubleshooting suggestions:'));
        console.log(chalk.gray('  • Check if all providers are configured correctly'));
        console.log(chalk.gray('  • Run "automatosx status" to verify installation'));
        console.log(chalk.gray('  • Try with --verbose flag for more details'));

        process.exit(1);
    }
}

// Enhanced error handling
process.on('uncaughtException', (error) => {
    console.error(chalk.red('\n💥 Unexpected error:'), error.message);
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.error(chalk.gray('Stack trace:'));
        console.error(error.stack);
    }
    console.error(chalk.yellow('\nTip: Run with --verbose for more details'));
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('\n💥 Unhandled Promise Rejection:'), reason);
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.error('Promise:', promise);
    }
    console.error(chalk.yellow('\nTip: This may indicate an async function error'));
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 AutomatosX initialization interrupted'));
    console.log(chalk.gray('Run "automatosx init" to retry initialization'));
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n\n👋 AutomatosX initialization terminated'));
    process.exit(0);
});

program.parse();
