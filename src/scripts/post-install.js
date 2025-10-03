#!/usr/bin/env node

/**
 * AutomatosX Post-Install Script
 * Automatically sets up project-level installation after npm install
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

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

async function createClaudeIntegrationFiles(projectRoot, commandsDir, mcpDir, stylesDir) {
    console.log(chalk.cyan('📝 Creating Claude Code integration files...'));

    const defaiRoot = path.join(projectRoot, '.defai');

    // Create MCP configuration file
    const mcpConfig = {
        mcpServers: {
            "automatosx-memory": {
                command: "node",
                args: [path.join(mcpDir, "http-memory-server.js")],
                env: {
                    PROJECT_ROOT: projectRoot,
                    DEFAI_ROOT: defaiRoot
                }
            }
        }
    };

    await fs.writeJson(path.join(mcpDir, 'automatosx.json'), mcpConfig, { spaces: 2 });
    console.log(chalk.gray('  Created MCP configuration'));

    // Create HTTP Memory Server
    const memoryServerCode = `#!/usr/bin/env node

import http from 'http';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MemoryServer {
    constructor(port = null) {
        this.requestedPort = port || 3001;
        this.actualPort = null;
        this.server = null;
        this.queue = [];
        this.processing = false;
        this.cache = new Map();
        this.stats = {
            totalRequests: 0,
            queuedWrites: 0,
            cacheHits: 0,
            errors: 0
        };
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => this.handleRequest(req, res));

            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.warn(\`Port \${this.requestedPort} in use, trying next port...\`);
                    this.requestedPort++;
                    this.server.listen(this.requestedPort);
                } else {
                    reject(error);
                }
            });

            this.server.listen(this.requestedPort, () => {
                this.actualPort = this.server.address().port;
                console.log(\`Memory Server listening on port \${this.actualPort}\`);
                this.savePortFile();
                resolve();
            });
        });
    }

    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.removePortFile();
                    resolve();
                });
            });
        }
    }

    async savePortFile() {
        try {
            const projectRoot = process.env.PROJECT_ROOT || process.cwd();
            const portFilePath = path.join(projectRoot, '.defai/memory/server.port');
            await fs.ensureDir(path.dirname(portFilePath));
            await fs.writeFile(portFilePath, this.actualPort.toString());
        } catch (error) {
            console.warn('Could not save port file:', error.message);
        }
    }

    async removePortFile() {
        try {
            const projectRoot = process.env.PROJECT_ROOT || process.cwd();
            const portFilePath = path.join(projectRoot, '.defai/memory/server.port');
            if (await fs.pathExists(portFilePath)) {
                await fs.remove(portFilePath);
            }
        } catch (error) {
            console.warn('Could not remove port file:', error.message);
        }
    }

    async handleRequest(req, res) {
        this.stats.totalRequests++;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        try {
            if (req.method === 'GET' && req.url === '/health') {
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'healthy', port: this.actualPort }));
                return;
            }

            if (req.method === 'GET' && req.url === '/stats') {
                res.writeHead(200);
                res.end(JSON.stringify(this.stats));
                return;
            }

            res.writeHead(200);
            res.end(JSON.stringify({ success: true }));
        } catch (error) {
            this.stats.errors++;
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }
}

if (import.meta.url === \`file://\${process.argv[1]}\`) {
    const server = new MemoryServer();
    await server.start();
}
`;

    await fs.writeFile(path.join(mcpDir, 'http-memory-server.js'), memoryServerCode);
    console.log(chalk.gray('  Created HTTP Memory Server'));

    // Create /ax:agent command
    const agentCommand = `# /ax:agent - Execute task with AI agent

Tell an AutomatosX agent to perform a task.

## Usage

\`\`\`
/ax:agent <agent-role> "<task description>"
\`\`\`

## Examples

\`\`\`
/ax:agent backend "Design a REST API for user authentication"
/ax:agent frontend "Create a responsive navigation component"
/ax:agent security "Review this code for vulnerabilities"
\`\`\`
`;

    await fs.writeFile(path.join(commandsDir, 'agent.md'), agentCommand);
    console.log(chalk.gray('  Created /ax:agent command'));

    // Create agent execution wrapper script
    const agentWrapperScript = `#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root (3 levels up from .claude/commands/ax/)
const projectRoot = path.resolve(__dirname, '../../..');
const defaiRoot = path.join(projectRoot, '.defai');

// Set environment variables
process.env.DEFAI_ROOT = defaiRoot;
process.env.PROJECT_ROOT = projectRoot;

// Import and run from .defai/src/
const { default: main } = await import(path.join(defaiRoot, 'src/index.js'));

await main(process.argv.slice(2));
`;

    await fs.writeFile(path.join(commandsDir, 'agent-wrapper.js'), agentWrapperScript);
    await fs.chmod(path.join(commandsDir, 'agent-wrapper.js'), '755');
    console.log(chalk.gray('  Created agent wrapper script'));

    // Create /ax:init command
    const initCommand = `# /ax:init - Factory Reset

Reset AutomatosX to default factory settings.

## Usage

\`\`\`
/ax:init
\`\`\`

## Description

This command resets AutomatosX to factory defaults, removing all configurations,
memory, chat history, and workspace data.
`;

    await fs.writeFile(path.join(commandsDir, 'init.md'), initCommand);
    console.log(chalk.gray('  Created /ax:init command'));

    // Create /ax:clear command
    const clearCommand = `# /ax:clear - Clear Memory

Clean all memory and chat history.

## Usage

\`\`\`
/ax:clear
\`\`\`

## Description

This command clears all stored memory and chat history while preserving
configurations and other settings.
`;

    await fs.writeFile(path.join(commandsDir, 'clear.md'), clearCommand);
    console.log(chalk.gray('  Created /ax:clear command'));

    // Create /ax:help command
    const helpCommand = `# /ax:help - Help Information

Display available agents and command usage information.

## Usage

\`\`\`
/ax:help
\`\`\`

## Description

Shows all available agents, their roles, and how to use AutomatosX commands.
`;

    await fs.writeFile(path.join(commandsDir, 'help.md'), helpCommand);
    console.log(chalk.gray('  Created /ax:help command'));

    // Create /ax:mcp command
    const mcpCommand = `# /ax:mcp - MCP Server Control

Control the AutomatosX MCP (Memory Coordination Protocol) server.

## Usage

\`\`\`
/ax:mcp start
/ax:mcp stop
/ax:mcp restart
\`\`\`

## Description

Start, stop, or restart the MCP server for memory coordination across agents.
`;

    await fs.writeFile(path.join(commandsDir, 'mcp.md'), mcpCommand);
    console.log(chalk.gray('  Created /ax:mcp command'));

    console.log(chalk.green('✅ Claude Code integration files created'));
}

async function postInstall() {
    console.log(chalk.blue('🎭 AutomatosX Post-Install Setup'));
    console.log(chalk.blue('================================\n'));

    try {
        const projectRoot = process.cwd();

        // Project-level directories
        const defaiDir = path.join(projectRoot, '.defai');
        const workspaceDir = path.join(projectRoot, '.defai/workspaces');
        const memoryDir = path.join(projectRoot, '.defai/memory');

        // Project-level Claude Code integration directories
        const claudeCommandsAxDir = path.join(projectRoot, '.claude/commands/ax');
        const claudeMcpAxDir = path.join(projectRoot, '.claude/mcp/ax');
        const claudeStylesAxDir = path.join(projectRoot, '.claude/styles/ax');

        // Step 1: Copy src/ to .defai/src/
        const srcDir = path.join(projectRoot, 'src');
        const defaiSrcDir = path.join(defaiDir, 'src');

        console.log(chalk.cyan('📦 Copying src/ to .defai/src/...'));
        await fs.copy(srcDir, defaiSrcDir, {
            overwrite: true,
            filter: (src) => {
                // Exclude tests and heavy files
                return !src.includes('__tests__') &&
                       !src.includes('node_modules') &&
                       !src.endsWith('.test.js');
            }
        });
        console.log(chalk.green(`✅ Copied src/ to ${defaiSrcDir}`));

        // Step 2: Create .defai directories
        await fs.ensureDir(defaiDir);
        await fs.ensureDir(workspaceDir);
        await fs.ensureDir(memoryDir);

        console.log(chalk.green('✅ Created workspace and memory directories'));
        console.log(chalk.gray(`   Workspaces: ${workspaceDir}`));
        console.log(chalk.gray(`   Memory: ${memoryDir}`));
        console.log(chalk.gray(`   DEFAI: ${defaiDir}`));

        // Create filesystem-map.json if it doesn't exist
        const filesystemMapPath = path.join(defaiDir, 'filesystem-map.json');
        if (!await fs.pathExists(filesystemMapPath)) {
            const filesystemMap = {
                version: "3.1.5",
                description: "AutomatosX filesystem mapping for safe operations",
                categories: {
                    system_core: {
                        description: "Core system files in project repo (should never be modified by users)",
                        patterns: ["src/**/*.js", "!src/__tests__/**", "!src/scripts/post-install.js", "!src/scripts/uninstall.js"],
                        exceptions: ["src/config/automatosx.config.template.yaml"]
                    },
                    defai_runtime: {
                        description: "Runtime copy of system in .defai (generated from src/)",
                        patterns: [".defai/src/**/*.js"],
                        exceptions: []
                    },
                    user_configuration: {
                        description: "User-editable configuration files",
                        patterns: ["automatosx.config.yaml", ".defai/config/**", "src/config/providers.json"],
                        exceptions: []
                    },
                    user_data: {
                        description: "User-generated data and memory",
                        patterns: [".defai/memory/**", ".defai/workspaces/**"],
                        exceptions: [".defai/backups/**"]
                    },
                    claude_integration: {
                        description: "Claude Code integration files",
                        patterns: [".claude/commands/ax/**", ".claude/mcp/ax/**", ".claude/styles/ax/**"],
                        exceptions: []
                    },
                    runtime_generated: {
                        description: "Runtime-generated files",
                        patterns: [".defai/agents/**", ".defai/memory/server.port", "workspaces/**"],
                        exceptions: []
                    },
                    documentation: {
                        description: "Project documentation",
                        patterns: ["docs/**/*.md", "*.md", "LICENSE"],
                        exceptions: []
                    }
                },
                directories: {
                    create_on_init: [".defai", ".defai/memory", ".defai/workspaces", ".defai/backups", ".defai/config", ".claude/commands/ax", ".claude/mcp/ax", ".claude/styles/ax"],
                    remove_on_factory_reset: [".defai/memory", ".defai/workspaces", ".defai/agents", "automatosx.config.yaml"],
                    backup_on_upgrade: [".defai/memory", ".defai/config", "automatosx.config.yaml"]
                },
                operations: {
                    factory_reset: {
                        backup_categories: ["user_data", "user_configuration"],
                        remove_categories: ["user_data", "user_configuration", "runtime_generated", "claude_integration", "defai_runtime"],
                        preserve_categories: ["system_core", "documentation"],
                        regenerate_after: ["defai_runtime", "claude_integration"]
                    },
                    safe_upgrade: {
                        backup_categories: ["user_data", "user_configuration"],
                        migrate_categories: ["user_configuration"],
                        regenerate_categories: ["claude_integration", "runtime_generated", "defai_runtime"]
                    },
                    uninstall: {
                        remove_categories: ["claude_integration", "runtime_generated", "user_data", "defai_runtime"],
                        prompt_for_backup: true
                    }
                },
                validation: {
                    required_files: ["src/index.js", "src/bin/automatosx.js", "src/core/enhanced-router.js", "src/core/profile-manager.js", "package.json"],
                    required_directories: ["src/agents", "src/core", "src/providers", "src/memory"]
                },
                migration_rules: {
                    v3_to_v4: {
                        file_moves: {".defai/old-config/**": ".defai/config"},
                        deprecated_files: [".defai/legacy-memory.json"]
                    }
                }
            };
            await fs.writeJson(filesystemMapPath, filesystemMap, { spaces: 2 });
            console.log(chalk.green('✅ Created filesystem map'));
        }

        // Create project-level Claude Code integration directories
        await fs.ensureDir(claudeCommandsAxDir);
        await fs.ensureDir(claudeMcpAxDir);
        await fs.ensureDir(claudeStylesAxDir);

        console.log(chalk.green('✅ Created Claude Code integration directories'));
        console.log(chalk.gray(`   Commands: ${claudeCommandsAxDir}`));
        console.log(chalk.gray(`   MCP: ${claudeMcpAxDir}`));
        console.log(chalk.gray(`   Styles: ${claudeStylesAxDir}`));

        // Create Claude Code integration files
        await createClaudeIntegrationFiles(projectRoot, claudeCommandsAxDir, claudeMcpAxDir, claudeStylesAxDir);

        // Validate configuration
        const profilesDir = path.join(projectRoot, 'src/agents');
        if (await fs.pathExists(profilesDir)) {
            console.log(chalk.green('✅ Agent profiles found'));
        } else {
            console.log(chalk.yellow('⚠️  Warning: No agent profiles directory found'));
        }

        // Check provider configuration
        const configDir = path.join(projectRoot, 'src/config');
        if (await fs.pathExists(configDir)) {
            console.log(chalk.green('✅ Configuration directory found'));
        } else {
            await fs.ensureDir(configDir);
            console.log(chalk.green('✅ Created configuration directory'));
        }

        console.log(chalk.green('\n🎉 Post-install setup completed successfully!'));
        console.log(chalk.blue('\n📝 Next steps:'));
        console.log('   npm run validate    # Validate configuration');
        console.log('   npm run status      # Check system health');
        console.log('   npm start           # Start the system');

    } catch (error) {
        console.error(chalk.red('❌ Post-install setup failed:'), error.message);
        process.exit(1);
    }
}

postInstall().catch(console.error);
