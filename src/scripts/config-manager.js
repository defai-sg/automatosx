#!/usr/bin/env node

/**
 * AutomatosX Provider Configuration Manager
 * Manage AI provider settings easily
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

class ConfigManager {
    constructor() {
        this.configPath = path.join(process.cwd(), 'src/config/providers.json');
        this.config = null;
    }

    async loadConfig() {
        if (await fs.pathExists(this.configPath)) {
            this.config = await fs.readJson(this.configPath);
        } else {
            // Create default config if not exists
            await this.createDefaultConfig();
        }
        return this.config;
    }

    async saveConfig() {
        await fs.ensureDir(path.dirname(this.configPath));
        await fs.writeJson(this.configPath, this.config, { spaces: 2 });
    }

    async createDefaultConfig() {
        const defaultConfig = {
            providers: {
                claude: {
                    enabled: true,
                    priority: 1,
                    description: "Claude Code CLI - Free access through authentication",
                    command: "claude",
                    cost: "free",
                    features: ["code", "analysis", "general"]
                },
                gemini: {
                    enabled: false,
                    priority: 2,
                    description: "Google Gemini CLI - Cost-effective AI provider",
                    command: "gcloud",
                    cost: "low",
                    features: ["code", "analysis", "general", "multimodal"]
                },
                openai: {
                    enabled: false,
                    priority: 3,
                    description: "OpenAI CLI - High-quality AI provider",
                    command: "openai",
                    cost: "medium",
                    features: ["code", "analysis", "general", "creative"]
                }
            },
            routing: {
                auto_fallback: true,
                max_retries: 3,
                timeout_seconds: 30,
                prefer_free: true
            },
            usage_tracking: {
                enabled: true,
                log_path: ".defai/workspaces/logs/provider-usage.log"
            }
        };

        await fs.ensureDir(path.dirname(this.configPath));
        await fs.writeJson(this.configPath, defaultConfig, { spaces: 2 });
        this.config = defaultConfig;
    }

    async showStatus() {
        await this.loadConfig();

        console.log(chalk.blue('\n🤖 AutomatosX Provider Configuration\n'));

        const providers = Object.entries(this.config.providers);
        providers.sort(([,a], [,b]) => a.priority - b.priority);

        providers.forEach(([name, config]) => {
            const status = config.enabled ?
                chalk.green('✅ ENABLED') :
                chalk.red('❌ DISABLED');

            console.log(`${status} ${chalk.bold(name.toUpperCase())}`);
            console.log(chalk.gray(`   ${config.description}`));
            console.log(chalk.gray(`   Priority: ${config.priority} | Cost: ${config.cost}`));
            console.log();
        });

        console.log(chalk.blue('📊 Routing Settings:'));
        console.log(chalk.gray(`   Auto Fallback: ${this.config.routing.auto_fallback ? 'ON' : 'OFF'}`));
        console.log(chalk.gray(`   Max Retries: ${this.config.routing.max_retries}`));
        console.log(chalk.gray(`   Prefer Free: ${this.config.routing.prefer_free ? 'YES' : 'NO'}`));
        console.log();
    }

    async enableProvider(providerName) {
        await this.loadConfig();

        if (!this.config.providers[providerName]) {
            throw new Error(`Unknown provider: ${providerName}`);
        }

        this.config.providers[providerName].enabled = true;
        await this.saveConfig();

        console.log(chalk.green(`✅ Enabled ${providerName.toUpperCase()} provider`));
    }

    async disableProvider(providerName) {
        await this.loadConfig();

        if (!this.config.providers[providerName]) {
            throw new Error(`Unknown provider: ${providerName}`);
        }

        this.config.providers[providerName].enabled = false;
        await this.saveConfig();

        console.log(chalk.red(`❌ Disabled ${providerName.toUpperCase()} provider`));
    }

    async setPriority(providerName, priority) {
        await this.loadConfig();

        if (!this.config.providers[providerName]) {
            throw new Error(`Unknown provider: ${providerName}`);
        }

        this.config.providers[providerName].priority = parseInt(priority);
        await this.saveConfig();

        console.log(chalk.blue(`🔄 Set ${providerName.toUpperCase()} priority to ${priority}`));
    }

    async testProviders() {
        await this.loadConfig();

        console.log(chalk.blue('\n🧪 Testing Provider CLIs...\n'));

        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        for (const [name, config] of Object.entries(this.config.providers)) {
            if (!config.enabled) {
                console.log(chalk.gray(`⏭️  Skipping ${name.toUpperCase()} (disabled)`));
                continue;
            }

            try {
                let testCommand;
                switch (name) {
                    case 'claude':
                        testCommand = 'claude --version';
                        break;
                    case 'gemini':
                        testCommand = 'gcloud --version';
                        break;
                    case 'openai':
                        testCommand = 'openai --version || python -c "import openai; print(openai.__version__)"';
                        break;
                    default:
                        testCommand = `${config.command} --version`;
                }

                await execAsync(testCommand);
                console.log(chalk.green(`✅ ${name.toUpperCase()} CLI available`));
            } catch (error) {
                console.log(chalk.red(`❌ ${name.toUpperCase()} CLI not found or not working`));
                console.log(chalk.gray(`   Error: ${error.message.split('\n')[0]}`));
            }
        }
        console.log();
    }

    async interactiveSetup() {
        console.log(chalk.blue('\n🚀 AutomatosX Interactive Provider Setup\n'));

        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (prompt) => new Promise(resolve => {
            rl.question(prompt, resolve);
        });

        try {
            await this.loadConfig();

            // Ask about each provider
            for (const [name, config] of Object.entries(this.config.providers)) {
                console.log(chalk.bold(`\n${name.toUpperCase()}`));
                console.log(chalk.gray(config.description));

                const enable = await question(`Enable ${name}? (y/n) [${config.enabled ? 'y' : 'n'}]: `);

                if (enable.toLowerCase() === 'y' || enable.toLowerCase() === 'yes') {
                    config.enabled = true;
                    console.log(chalk.green(`✅ ${name} enabled`));
                } else if (enable.toLowerCase() === 'n' || enable.toLowerCase() === 'no') {
                    config.enabled = false;
                    console.log(chalk.red(`❌ ${name} disabled`));
                }
            }

            await this.saveConfig();
            console.log(chalk.green('\n✅ Configuration saved!'));

        } finally {
            rl.close();
        }
    }
}

async function main() {
    const configManager = new ConfigManager();
    const command = process.argv[2];
    const args = process.argv.slice(3);

    try {
        switch (command) {
            case 'status':
            case 'show':
                await configManager.showStatus();
                break;

            case 'enable':
                if (!args[0]) {
                    console.error(chalk.red('Error: Provider name required'));
                    console.log(chalk.gray('Usage: node config-manager.js enable <provider>'));
                    process.exit(1);
                }
                await configManager.enableProvider(args[0]);
                break;

            case 'disable':
                if (!args[0]) {
                    console.error(chalk.red('Error: Provider name required'));
                    console.log(chalk.gray('Usage: node config-manager.js disable <provider>'));
                    process.exit(1);
                }
                await configManager.disableProvider(args[0]);
                break;

            case 'priority':
                if (!args[0] || !args[1]) {
                    console.error(chalk.red('Error: Provider name and priority required'));
                    console.log(chalk.gray('Usage: node config-manager.js priority <provider> <number>'));
                    process.exit(1);
                }
                await configManager.setPriority(args[0], args[1]);
                break;

            case 'test':
                await configManager.testProviders();
                break;

            case 'setup':
                await configManager.interactiveSetup();
                break;

            case 'init':
                await configManager.createDefaultConfig();
                console.log(chalk.green('✅ Default configuration created'));
                break;

            default:
                console.log(chalk.blue('🤖 AutomatosX Configuration Manager\n'));
                console.log(chalk.bold('Available commands:'));
                console.log(chalk.gray('  status     - Show current configuration'));
                console.log(chalk.gray('  enable     - Enable a provider'));
                console.log(chalk.gray('  disable    - Disable a provider'));
                console.log(chalk.gray('  priority   - Set provider priority'));
                console.log(chalk.gray('  test       - Test provider CLI availability'));
                console.log(chalk.gray('  setup      - Interactive configuration'));
                console.log(chalk.gray('  init       - Create default configuration'));
                console.log();
                console.log(chalk.bold('Examples:'));
                console.log(chalk.gray('  node config-manager.js status'));
                console.log(chalk.gray('  node config-manager.js enable gemini'));
                console.log(chalk.gray('  node config-manager.js disable openai'));
                console.log(chalk.gray('  node config-manager.js test'));
                console.log(chalk.gray('  node config-manager.js setup'));
        }
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

main().catch(console.error);
