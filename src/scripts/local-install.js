#!/usr/bin/env node

/**
 * AutomatosX Local Installation Script
 * Creates local development installation
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
import { spawn } from 'child_process';
import chalk from 'chalk';

async function localInstall() {
    console.log(chalk.blue('🎭 AutomatosX Local Installation'));
    console.log(chalk.blue('==============================\n'));

    try {
        // Ensure necessary directories
        const workspaceDir = path.join(process.cwd(), '.defai', 'workspaces');
        const memoryDir = path.join(process.cwd(), '.defai/memory');
        const defaiDir = path.join(process.cwd(), '.defai');

        // Global Claude Code integration directories
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        const globalClaudeDir = path.join(homeDir, '.claude');
        const claudeCommandsAxDir = path.join(homeDir, '.claude/commands/ax');
        const claudeMcpAxDir = path.join(homeDir, '.claude/mcp/ax');

        await fs.ensureDir(workspaceDir);
        await fs.ensureDir(memoryDir);
        await fs.ensureDir(defaiDir);

        // Create global Claude Code integration directories
        await fs.ensureDir(claudeCommandsAxDir);
        await fs.ensureDir(claudeMcpAxDir);

        // Copy Claude commands to global directory
        const localCommandsDir = path.join(process.cwd(), '.claude/commands');
        if (await fs.pathExists(localCommandsDir)) {
            await fs.copy(localCommandsDir, claudeCommandsAxDir);
            console.log(chalk.green('✅ Copied Claude commands to global directory'));
        }

        // Copy MCP files to global directory if they exist
        const localMcpDir = path.join(process.cwd(), '.claude/mcp');
        if (await fs.pathExists(localMcpDir)) {
            await fs.copy(localMcpDir, claudeMcpAxDir);
            console.log(chalk.green('✅ Copied MCP files to global directory'));
        }

        console.log(chalk.green('✅ Created workspace and memory directories'));
        console.log(chalk.gray(`   Workspaces: ${workspaceDir}`));
        console.log(chalk.gray(`   Memory: ${memoryDir}`));
        console.log(chalk.gray(`   DEFAI: ${defaiDir}`));

        console.log(chalk.green('✅ Created Claude Code integration directories'));
        console.log(chalk.gray(`   Commands: ${claudeCommandsAxDir}`));
        console.log(chalk.gray(`   MCP: ${claudeMcpAxDir}`));

        // Validate configuration
        const profilesDir = path.join(process.cwd(), 'profiles');
        if (await fs.pathExists(profilesDir)) {
            console.log(chalk.green('✅ Agent profiles found'));
        } else {
            console.log(chalk.yellow('⚠️  Warning: No agent profiles directory found'));
        }

        // Check provider configuration
        const configDir = path.join(process.cwd(), 'config');
        if (await fs.pathExists(configDir)) {
            console.log(chalk.green('✅ Configuration directory found'));
        } else {
            await fs.ensureDir(configDir);
            console.log(chalk.green('✅ Created configuration directory'));
        }

        console.log(chalk.green('\n🎉 Local installation completed successfully!'));
        console.log(chalk.blue('\n📝 Next steps:'));
        console.log('   npm run validate    # Validate configuration');
        console.log('   npm run status      # Check system health');
        console.log('   npm start           # Start the system');

    } catch (error) {
        console.error(chalk.red('❌ Installation failed:'), error.message);
        process.exit(1);
    }
}

localInstall().catch(console.error);
