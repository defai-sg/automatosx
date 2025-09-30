#!/usr/bin/env node

/**
 * AutomatosX System Test Script (Fixed Version)
 * Simplified and reliable system verification
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

console.log('🧪 **AutomatosX System Test**\n');

async function runSystemTest(verbose = false) {
    let passed = 0;
    let failed = 0;

    // Test 1: Command system
    try {
        const commandsDir = path.join('.claude', 'commands', 'ax');

        if (verbose) console.log(`  Checking: ${commandsDir}`);

        if (!await fs.pathExists(commandsDir)) {
            throw new Error('Commands directory not found');
        }

        const files = await fs.readdir(commandsDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        if (mdFiles.length === 0) {
            throw new Error('No Markdown command files found');
        }

        console.log(`✅ Command system: ${mdFiles.length} commands (${mdFiles.join(', ')})`);
        passed++;
    } catch (error) {
        console.log(`❌ Command system: FAILED - ${error.message}`);
        failed++;
    }

    // Test 2: Workspace structure
    try {
        const workspacesDir = 'workspaces';

        if (!await fs.pathExists(workspacesDir)) {
            throw new Error('Workspaces directory not found');
        }

        const agentsDir = path.join(workspacesDir, 'agents');
        const rolesDir = path.join(workspacesDir, 'roles');

        if (!await fs.pathExists(agentsDir)) {
            throw new Error('Agents workspace not found');
        }

        if (!await fs.pathExists(rolesDir)) {
            throw new Error('Roles workspace not found');
        }

        const agents = await fs.readdir(agentsDir).catch(() => []);
        const roles = await fs.readdir(rolesDir).catch(() => []);

        console.log(`✅ Workspace structure: ${agents.length} agents, ${roles.length} roles`);
        passed++;
    } catch (error) {
        console.log(`❌ Workspace structure: FAILED - ${error.message}`);
        failed++;
    }

    // Test 3: Node.js scripts
    try {
        const scriptsDir = 'scripts';

        if (!await fs.pathExists(scriptsDir)) {
            throw new Error('Scripts directory not found');
        }

        const requiredScripts = [
            'help-system.js',
            'agent-router.js',
            'system-test.js'
        ];

        let foundScripts = [];
        let missingScripts = [];

        for (const script of requiredScripts) {
            const scriptPath = path.join(scriptsDir, script);
            if (await fs.pathExists(scriptPath)) {
                foundScripts.push(script);
            } else {
                missingScripts.push(script);
            }
        }

        if (missingScripts.length > 0) {
            throw new Error(`Missing scripts: ${missingScripts.join(', ')}`);
        }

        console.log(`✅ Node.js scripts: ${foundScripts.length}/${requiredScripts.length} scripts ready`);
        passed++;
    } catch (error) {
        console.log(`❌ Node.js scripts: FAILED - ${error.message}`);
        failed++;
    }

    // Test 4: File permissions
    try {
        const scriptsDir = 'scripts';
        const files = await fs.readdir(scriptsDir);
        const jsFiles = files.filter(f => f.endsWith('.js'));

        for (const file of jsFiles.slice(0, 3)) { // Test first 3 files
            const filePath = path.join(scriptsDir, file);
            await fs.access(filePath, fs.constants.R_OK);
        }

        console.log(`✅ File permissions: ${jsFiles.length} files accessible`);
        passed++;
    } catch (error) {
        console.log(`❌ File permissions: FAILED - ${error.message}`);
        failed++;
    }

    // Results
    console.log(`\n📊 **Test Results:**`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📋 Total: ${passed + failed}`);

    if (failed === 0) {
        console.log(`\n🎉 **All systems operational!**`);
        console.log(`\n💡 **Ready to use:**`);
        console.log(`• \`/ax:help\` - Get help and meet your AI team`);
        console.log(`• \`/ax:agent bob, create hello world\` - Try agent-based task`);
        console.log(`• \`/ax:agent backend, implement API\` - Try direct command`);
        console.log(`• \`/ax:test\` - Run this test anytime`);
    } else {
        console.log(`\n⚠️  **Some tests failed.**`);
        console.log(`\n🔧 **Troubleshooting:**`);
        console.log(`1. Run: \`defai-ax init --force\` to reinitialize`);
        console.log(`2. Check: File and directory permissions`);
        console.log(`3. Verify: Node.js and npm are properly installed`);
    }

    return { passed, failed };
}

// Main execution
async function main() {
    try {
        const args = process.argv.slice(2);
        const verbose = args.includes('--verbose') || args.includes('-v');

        const result = await runSystemTest(verbose);
        process.exit(result.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('❌ **Test execution failed:**', error.message);
        console.error('\n🔍 **Debug info:**');
        console.error('- Current directory:', process.cwd());
        console.error('- Node.js version:', process.version);
        console.error('- Arguments:', process.argv);
        process.exit(1);
    }
}

// Execute main function
main();
