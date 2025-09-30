#!/usr/bin/env node

/**
 * AutomatosX Reset and Uninstall Function Test
 * Bob's implementation to test the new reset and uninstall functionality
 * Let's test this rock-solid.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { ConfigResetSystem } from '../scripts/reset-config.js';
import { UninstallSystem } from '../scripts/uninstall.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ResetUninstallTest {
    constructor() {
        this.projectPath = path.resolve(__dirname, '..');
        this.testResults = {
            resetConfig: { passed: 0, failed: 0, tests: [] },
            uninstall: { passed: 0, failed: 0, tests: [] },
            npmScripts: { passed: 0, failed: 0, tests: [] }
        };
    }

    async runAllTests() {
        console.log(chalk.blue('🧪 Bob: Starting Reset and Uninstall Tests'));
        console.log(chalk.gray('💭 "Let\'s test this rock-solid."\n'));

        try {
            await this.testResetConfigSystem();
            await this.testUninstallSystem();
            await this.testNpmScripts();

            this.printResults();
        } catch (error) {
            console.error(chalk.red('❌ Test suite failed:'), error.message);
            process.exit(1);
        }
    }

    async testResetConfigSystem() {
        console.log(chalk.cyan('📝 Testing ConfigResetSystem...'));

        const resetSystem = new ConfigResetSystem(this.projectPath);

        // Test 1: Status check
        await this.runTest('resetConfig', 'Status Check', async () => {
            await resetSystem.showStatus();
            return true;
        });

        // Test 2: Backup creation
        await this.runTest('resetConfig', 'Backup Creation', async () => {
            const backupDir = await resetSystem.backupCurrentConfig();
            const exists = await fs.pathExists(backupDir);
            if (exists) {
                console.log(chalk.gray(`     ✓ Backup created at: ${backupDir}`));
            }
            return exists;
        });

        // Test 3: Specific reset (providers)
        await this.runTest('resetConfig', 'Specific Reset (Providers)', async () => {
            await resetSystem.resetSpecific('providers');
            const configPath = path.join(this.projectPath, 'src/config/providers.json');
            const exists = await fs.pathExists(configPath);
            if (exists) {
                const config = await fs.readJson(configPath);
                const hasClaudeCode = config['claude-code'] && config['claude-code'].enabled;
                console.log(chalk.gray(`     ✓ Provider config has claude-code: ${hasClaudeCode}`));
                return hasClaudeCode;
            }
            return false;
        });

        // Test 4: Main config reset
        await this.runTest('resetConfig', 'Main Config Reset', async () => {
            await resetSystem.resetMainConfig();
            const configPath = path.join(this.projectPath, 'automatosx.config.yaml');
            const exists = await fs.pathExists(configPath);
            if (exists) {
                const content = await fs.readFile(configPath, 'utf8');
                const hasProviders = content.includes('providers:');
                console.log(chalk.gray(`     ✓ Config has providers section: ${hasProviders}`));
                return hasProviders;
            }
            return false;
        });

        console.log('');
    }

    async testUninstallSystem() {
        console.log(chalk.red('🗑️  Testing UninstallSystem...'));

        const uninstallSystem = new UninstallSystem(this.projectPath);

        // Test 1: Status check
        await this.runTest('uninstall', 'Status Check', async () => {
            await uninstallSystem.showUninstallStatus();
            return true;
        });

        // Test 2: Package info loading
        await this.runTest('uninstall', 'Package Info Loading', async () => {
            await uninstallSystem.loadPackageInfo();
            const hasPackageJson = uninstallSystem.packageJson !== null;
            if (hasPackageJson) {
                console.log(chalk.gray(`     ✓ Package name: ${uninstallSystem.packageJson.name}`));
            }
            return hasPackageJson;
        });

        // Test 3: Backup creation
        await this.runTest('uninstall', 'Uninstall Backup Creation', async () => {
            const backupDir = await uninstallSystem.createUninstallBackup();
            const exists = await fs.pathExists(backupDir);
            if (exists) {
                console.log(chalk.gray(`     ✓ Uninstall backup created at: ${backupDir}`));
            }
            return exists;
        });

        // Test 4: Workspace info gathering
        await this.runTest('uninstall', 'Workspace Info Gathering', async () => {
            const info = await uninstallSystem.gatherWorkspaceInfo();
            const hasInfo = info && info.projectPath && info.timestamp;
            if (hasInfo) {
                console.log(chalk.gray(`     ✓ Workspace info gathered for: ${info.projectPath}`));
            }
            return hasInfo;
        });

        console.log('');
    }

    async testNpmScripts() {
        console.log(chalk.green('📦 Testing NPM Scripts...'));

        const packageJsonPath = path.join(this.projectPath, 'package.json');
        const packageJson = await fs.readJson(packageJsonPath);

        // Define required scripts
        const requiredScripts = [
            'reset:config',
            'reset:memory',
            'reset:workspace',
            'reset:providers',
            'reset:all',
            'reset:status',
            'backup:config',
            'backup:uninstall',
            'uninstall:global',
            'uninstall:clean',
            'uninstall:status'
        ];

        // Test script existence
        await this.runTest('npmScripts', 'Required Scripts Exist', async () => {
            const scripts = packageJson.scripts || {};
            const missingScripts = requiredScripts.filter(script => !scripts[script]);

            if (missingScripts.length === 0) {
                console.log(chalk.gray(`     ✓ All ${requiredScripts.length} required scripts found`));
                return true;
            } else {
                console.log(chalk.yellow(`     ⚠ Missing scripts: ${missingScripts.join(', ')}`));
                return false;
            }
        });

        // Test script files exist
        await this.runTest('npmScripts', 'Script Files Exist', async () => {
            const scriptFiles = [
                'scripts/reset-config.js',
                'scripts/uninstall.js',
                'scripts/memory-clear.js'
            ];

            const existingFiles = [];
            for (const file of scriptFiles) {
                const filePath = path.join(this.projectPath, file);
                if (await fs.pathExists(filePath)) {
                    existingFiles.push(file);
                }
            }

            const allExist = existingFiles.length === scriptFiles.length;
            console.log(chalk.gray(`     ✓ Script files found: ${existingFiles.length}/${scriptFiles.length}`));
            return allExist;
        });

        // Test that scripts are executable
        await this.runTest('npmScripts', 'Script Files Executable', async () => {
            const scriptFiles = [
                'scripts/reset-config.js',
                'scripts/uninstall.js'
            ];

            let executableCount = 0;
            for (const file of scriptFiles) {
                const filePath = path.join(this.projectPath, file);
                if (await fs.pathExists(filePath)) {
                    const content = await fs.readFile(filePath, 'utf8');
                    if (content.startsWith('#!/usr/bin/env node')) {
                        executableCount++;
                    }
                }
            }

            const allExecutable = executableCount === scriptFiles.length;
            console.log(chalk.gray(`     ✓ Executable scripts: ${executableCount}/${scriptFiles.length}`));
            return allExecutable;
        });

        console.log('');
    }

    async runTest(category, testName, testFunction) {
        try {
            const result = await testFunction();
            if (result) {
                this.testResults[category].passed++;
                this.testResults[category].tests.push({ name: testName, status: 'PASS' });
                console.log(chalk.green(`  ✅ ${testName}`));
            } else {
                this.testResults[category].failed++;
                this.testResults[category].tests.push({ name: testName, status: 'FAIL' });
                console.log(chalk.red(`  ❌ ${testName}`));
            }
        } catch (error) {
            this.testResults[category].failed++;
            this.testResults[category].tests.push({ name: testName, status: 'ERROR', error: error.message });
            console.log(chalk.red(`  ❌ ${testName}: ${error.message}`));
        }
    }

    printResults() {
        console.log(chalk.blue('\n📊 Test Results Summary'));
        console.log(chalk.gray('━'.repeat(50)));

        let totalPassed = 0;
        let totalFailed = 0;

        for (const [category, results] of Object.entries(this.testResults)) {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            const passRate = results.passed + results.failed > 0
                ? Math.round((results.passed / (results.passed + results.failed)) * 100)
                : 0;

            console.log(chalk.cyan(`\n${categoryName}:`));
            console.log(chalk.green(`  ✅ Passed: ${results.passed}`));
            console.log(chalk.red(`  ❌ Failed: ${results.failed}`));
            console.log(chalk.blue(`  📈 Pass Rate: ${passRate}%`));

            totalPassed += results.passed;
            totalFailed += results.failed;
        }

        const overallPassRate = totalPassed + totalFailed > 0
            ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100)
            : 0;

        console.log(chalk.blue('\n🎯 Overall Results:'));
        console.log(chalk.green(`  ✅ Total Passed: ${totalPassed}`));
        console.log(chalk.red(`  ❌ Total Failed: ${totalFailed}`));
        console.log(chalk.blue(`  📈 Overall Pass Rate: ${overallPassRate}%`));

        if (totalFailed === 0) {
            console.log(chalk.green('\n🎉 All tests passed! Reset and Uninstall functionality is working rock-solid!'));
            console.log(chalk.cyan('🎭 Bob: "Tests completed rock-solid!"'));
        } else {
            console.log(chalk.yellow(`\n⚠️  ${totalFailed} test(s) failed. Please review the implementation.`));
            console.log(chalk.cyan('🎭 Bob: "Some tests need attention, but we\'ll get it rock-solid!"'));
        }
    }
}

// Run tests if called directly
if (process.argv[1] && (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('reset-uninstall-test.js'))) {
    const tester = new ResetUninstallTest();
    tester.runAllTests().catch(error => {
        console.error(chalk.red('Test execution failed:'), error);
        process.exit(1);
    });
}

export { ResetUninstallTest };