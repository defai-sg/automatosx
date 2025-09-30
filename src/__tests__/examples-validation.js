#!/usr/bin/env node

/**
 * AutomatosX Examples Validation Test
 * Validates that all examples can run without errors and system requirements are met
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const examplesDir = path.join(projectRoot, 'examples');

class ExamplesValidator {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            details: []
        };
    }

    async validateSystemRequirements() {
        console.log(chalk.blue.bold('🔍 Validating System Requirements\n'));

        const requirements = [
            { name: 'Node.js Version', check: () => this.checkNodeVersion() },
            { name: 'Project Dependencies', check: () => this.checkDependencies() },
            { name: 'Core Configuration', check: () => this.checkCoreConfig() },
            { name: 'Agent Profiles', check: () => this.checkAgentProfiles() },
            { name: 'Agent Abilities', check: () => this.checkAgentAbilities() }
        ];

        let allPassed = true;

        for (const req of requirements) {
            try {
                const result = await req.check();
                if (result.success) {
                    console.log(chalk.green(`   ✅ ${req.name}: ${result.message}`));
                } else {
                    console.log(chalk.red(`   ❌ ${req.name}: ${result.message}`));
                    allPassed = false;
                }
            } catch (error) {
                console.log(chalk.red(`   ❌ ${req.name}: ${error.message}`));
                allPassed = false;
            }
        }

        console.log();
        return allPassed;
    }

    async checkNodeVersion() {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);

        if (major >= 18) {
            return { success: true, message: `${version} (✓ >= 18)` };
        } else {
            return { success: false, message: `${version} (requires >= 18)` };
        }
    }

    async checkDependencies() {
        const packageJsonPath = path.join(projectRoot, 'package.json');
        const nodeModulesPath = path.join(projectRoot, 'node_modules');

        if (!await fs.pathExists(packageJsonPath)) {
            return { success: false, message: 'package.json not found' };
        }

        if (!await fs.pathExists(nodeModulesPath)) {
            return { success: false, message: 'node_modules not found (run: npm install)' };
        }

        return { success: true, message: 'Dependencies installed' };
    }

    async checkCoreConfig() {
        const requiredPaths = [
            'src/core/enhanced-router.js',
            'src/core/agent-manager.js',
            'src/core/profile-manager.js',
            'src/agents/agent-profiles.js'
        ];

        for (const reqPath of requiredPaths) {
            const fullPath = path.join(projectRoot, reqPath);
            if (!await fs.pathExists(fullPath)) {
                return { success: false, message: `Missing: ${reqPath}` };
            }
        }

        return { success: true, message: 'Core configuration files present' };
    }

    async checkAgentProfiles() {
        const agentsRoot = path.join(projectRoot, 'src/agents');

        if (!await fs.pathExists(agentsRoot)) {
            return { success: false, message: 'src/agents/ directory not found' };
        }

        let count = 0;
        const entries = await fs.readdir(agentsRoot);
        for (const entry of entries) {
            if (entry.startsWith('_') || entry.endsWith('.js')) continue;
            const entryPath = path.join(agentsRoot, entry);
            try {
                const stats = await fs.stat(entryPath);
                if (!stats.isDirectory()) continue;
                const profilePath = path.join(entryPath, 'profile.yaml');
                if (await fs.pathExists(profilePath)) {
                    count++;
                }
            } catch (error) {
                // ignore
            }
        }

        if (count === 0) {
            return { success: false, message: 'No agent profile files found in src/agents/<role>/profile.yaml' };
        }

        return { success: true, message: `${count} agent profile files found` };
    }

    async checkAgentAbilities() {
        const agentsRoot = path.join(projectRoot, 'src/agents');

        if (!await fs.pathExists(agentsRoot)) {
            return { success: false, message: 'src/agents/ directory not found' };
        }

        const entries = await fs.readdir(agentsRoot);
        const validRoles = [];

        for (const entry of entries) {
            if (entry.startsWith('_') || entry.endsWith('.js')) continue;
            const entryPath = path.join(agentsRoot, entry);
            const stats = await fs.stat(entryPath);
            if (!stats.isDirectory()) continue;

            const abilitiesDir = path.join(entryPath, 'abilities');
            if (!await fs.pathExists(abilitiesDir)) continue;

            const files = await fs.readdir(abilitiesDir);
            const mdFiles = files.filter(f => f.endsWith('.md'));
            if (mdFiles.length > 0) {
                validRoles.push(entry);
            }
        }

        if (validRoles.length === 0) {
            return { success: false, message: 'No agent abilities directories with .md files found' };
        }

        return { success: true, message: `${validRoles.length} agent abilities directories found` };
    }

    async getExampleFiles() {
        const files = await fs.readdir(examplesDir);
        return files.filter(f => f.endsWith('.js') && f !== 'README.md');
    }

    async runExample(exampleFile) {
        return new Promise((resolve) => {
            const examplePath = path.join(examplesDir, exampleFile);
            const startTime = Date.now();

            console.log(chalk.cyan(`📝 Testing: ${exampleFile}`));

            const child = spawn('node', [examplePath], {
                cwd: projectRoot,
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 30000 // 30 second timeout
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                const duration = Date.now() - startTime;
                const result = {
                    file: exampleFile,
                    code,
                    duration,
                    stdout,
                    stderr,
                    success: code === 0
                };

                if (result.success) {
                    console.log(chalk.green(`   ✅ Passed (${duration}ms)`));
                } else {
                    console.log(chalk.red(`   ❌ Failed (exit code: ${code})`));
                    if (stderr) {
                        console.log(chalk.red(`   Error: ${stderr.split('\n')[0]}`));
                    }
                }

                resolve(result);
            });

            child.on('error', (error) => {
                console.log(chalk.red(`   ❌ Error: ${error.message}`));
                resolve({
                    file: exampleFile,
                    code: -1,
                    duration: Date.now() - startTime,
                    stdout: '',
                    stderr: error.message,
                    success: false
                });
            });
        });
    }

    async validateExamples() {
        console.log(chalk.blue.bold('🧪 Validating Examples\n'));

        try {
            const exampleFiles = await this.getExampleFiles();
            this.results.total = exampleFiles.length;

            if (exampleFiles.length === 0) {
                console.log(chalk.yellow('⚠️  No example files found'));
                return false;
            }

            console.log(chalk.gray(`Found ${exampleFiles.length} example files\n`));

            for (const file of exampleFiles) {
                const result = await this.runExample(file);
                this.results.details.push(result);

                if (result.success) {
                    this.results.passed++;
                } else {
                    this.results.failed++;
                }
            }

            return this.results.failed === 0;

        } catch (error) {
            console.error(chalk.red('❌ Error during example validation:'), error.message);
            return false;
        }
    }

    printSummary() {
        console.log(chalk.blue.bold('\n📊 Validation Summary'));
        console.log('─'.repeat(40));

        console.log(`Total examples: ${this.results.total}`);
        console.log(chalk.green(`Passed: ${this.results.passed}`));

        if (this.results.failed > 0) {
            console.log(chalk.red(`Failed: ${this.results.failed}`));
        }

        if (this.results.skipped > 0) {
            console.log(chalk.yellow(`Skipped: ${this.results.skipped}`));
        }

        // Show details for failed tests
        const failed = this.results.details.filter(r => !r.success);
        if (failed.length > 0) {
            console.log(chalk.red.bold('\n❌ Failed Examples:'));
            failed.forEach(result => {
                console.log(chalk.red(`   • ${result.file}: ${result.stderr.split('\n')[0]}`));
            });
        }

        // Performance summary
        const totalTime = this.results.details.reduce((sum, r) => sum + r.duration, 0);
        console.log(chalk.gray(`\nTotal execution time: ${totalTime}ms`));

        const success = this.results.failed === 0;
        if (success) {
            console.log(chalk.green.bold('\n✅ All examples validation passed!'));
        } else {
            console.log(chalk.red.bold('\n❌ Some examples failed validation'));
            console.log(chalk.yellow('\n🔧 Troubleshooting:'));
            console.log(chalk.yellow('   1. Check system requirements above'));
            console.log(chalk.yellow('   2. Run: npm install'));
            console.log(chalk.yellow('   3. Run: npm run validate'));
            console.log(chalk.yellow('   4. See examples/README.md for details'));
        }

        return success;
    }

    async run() {
        console.log(chalk.blue.bold('🚀 AutomatosX Examples Validation\n'));

        // Step 1: Validate system requirements
        const requirementsPassed = await this.validateSystemRequirements();

        if (!requirementsPassed) {
            console.log(chalk.red('❌ System requirements not met. Fix issues above before running examples.'));
            process.exit(1);
        }

        // Step 2: Validate examples
        const examplesValid = await this.validateExamples();

        // Step 3: Print summary
        const success = this.printSummary();

        process.exit(success ? 0 : 1);
    }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const validator = new ExamplesValidator();
    validator.run().catch(error => {
        console.error(chalk.red('❌ Validation failed:'), error);
        process.exit(1);
    });
}

export { ExamplesValidator };
