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

        // Create .defai directories
        await fs.ensureDir(defaiDir);
        await fs.ensureDir(workspaceDir);
        await fs.ensureDir(memoryDir);

        console.log(chalk.green('✅ Created workspace and memory directories'));
        console.log(chalk.gray(`   Workspaces: ${workspaceDir}`));
        console.log(chalk.gray(`   Memory: ${memoryDir}`));
        console.log(chalk.gray(`   DEFAI: ${defaiDir}`));

        // Create project-level Claude Code integration directories
        await fs.ensureDir(claudeCommandsAxDir);
        await fs.ensureDir(claudeMcpAxDir);
        await fs.ensureDir(claudeStylesAxDir);

        console.log(chalk.green('✅ Created Claude Code integration directories'));
        console.log(chalk.gray(`   Commands: ${claudeCommandsAxDir}`));
        console.log(chalk.gray(`   MCP: ${claudeMcpAxDir}`));
        console.log(chalk.gray(`   Styles: ${claudeStylesAxDir}`));

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
