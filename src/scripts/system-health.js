#!/usr/bin/env node

/**
 * AutomatosX System Health Check and Auto-Recovery
 * Comprehensive system monitoring and automatic issue resolution
 */

import fs from 'fs-extra';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SystemHealthChecker {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.healthReport = {
            timestamp: new Date().toISOString(),
            overall: 'unknown',
            checks: {},
            warnings: [],
            errors: [],
            autoFixed: []
        };
    }

    async runHealthCheck() {
        console.log(chalk.bold.blue('🏥 AutomatosX System Health Check\n'));

        try {
            // Check directory structure
            await this.checkDirectoryStructure();

            // Check memory server connectivity
            await this.checkMemoryServer();

            // Check for orphaned processes
            await this.checkOrphanedProcesses();

            // Check configuration integrity
            await this.checkConfiguration();

            // Check port file consistency
            await this.checkPortFileConsistency();

            // Determine overall health
            this.calculateOverallHealth();

            // Display results
            this.displayHealthReport();

            return this.healthReport;

        } catch (error) {
            console.error(chalk.red('❌ Health check failed:'), error.message);
            this.healthReport.overall = 'critical';
            this.healthReport.errors.push(`Health check failed: ${error.message}`);
            return this.healthReport;
        }
    }

    async checkDirectoryStructure() {
        console.log(chalk.cyan('📁 Checking directory structure...'));

        const requiredDirs = [
            '.defai/memory',
            '.claude/commands',
            '.defai',
            'workspaces',
            'src/agents'
        ];

        const missingDirs = [];
        for (const dir of requiredDirs) {
            const fullPath = path.join(this.projectPath, dir);
            if (!await fs.pathExists(fullPath)) {
                missingDirs.push(dir);
            }
        }

        if (missingDirs.length > 0) {
            this.healthReport.warnings.push(`Missing directories: ${missingDirs.join(', ')}`);

            // Auto-fix: Create missing directories
            try {
                for (const dir of missingDirs) {
                    const fullPath = path.join(this.projectPath, dir);
                    await fs.ensureDir(fullPath);
                    this.healthReport.autoFixed.push(`Created missing directory: ${dir}`);
                }
                console.log(chalk.green('✅ Auto-fixed missing directories'));
            } catch (error) {
                this.healthReport.errors.push(`Failed to create directories: ${error.message}`);
            }
        }

        this.healthReport.checks.directoryStructure = missingDirs.length === 0 ? 'healthy' : 'fixed';
    }

    async checkMemoryServer() {
        console.log(chalk.cyan('🧠 Checking memory server...'));

        const portFilePath = path.join(this.projectPath, '.defai/memory/server.port');

        if (await fs.pathExists(portFilePath)) {
            try {
                const portString = await fs.readFile(portFilePath, 'utf8');
                const port = parseInt(portString.trim());

                if (port && port > 0) {
                    // Test server connectivity
                    const isServerRunning = await this.testServerConnection(port);

                    if (isServerRunning) {
                        this.healthReport.checks.memoryServer = 'healthy';
                        console.log(chalk.green(`✅ Memory server is running on port ${port}`));
                    } else {
                        this.healthReport.warnings.push(`Memory server port file exists but server is not responding on port ${port}`);

                        // Auto-fix: Remove stale port file
                        await fs.remove(portFilePath);
                        this.healthReport.autoFixed.push('Removed stale port file');
                        this.healthReport.checks.memoryServer = 'fixed';
                        console.log(chalk.yellow('⚠️  Removed stale port file'));
                    }
                } else {
                    this.healthReport.warnings.push('Invalid port number in port file');
                    await fs.remove(portFilePath);
                    this.healthReport.autoFixed.push('Removed invalid port file');
                    this.healthReport.checks.memoryServer = 'fixed';
                }
            } catch (error) {
                this.healthReport.errors.push(`Failed to read port file: ${error.message}`);
                this.healthReport.checks.memoryServer = 'error';
            }
        } else {
            this.healthReport.checks.memoryServer = 'offline';
            console.log(chalk.gray('ℹ️  Memory server is offline (no port file)'));
        }
    }

    async testServerConnection(port) {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: port,
                path: '/health',
                method: 'GET',
                timeout: 3000
            }, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });

            req.end();
        });
    }

    async checkOrphanedProcesses() {
        console.log(chalk.cyan('🔍 Checking for orphaned processes...'));

        try {
            const processes = execSync('ps aux | grep -E "memory-server|http-memory-server|automatosx" | grep -v grep', { encoding: 'utf8' });

            if (processes.trim()) {
                const lines = processes.trim().split('\n');
                this.healthReport.warnings.push(`Found ${lines.length} running processes`);
                console.log(chalk.yellow(`⚠️  Found ${lines.length} running processes`));

                // Don't auto-kill processes, just report them
                this.healthReport.checks.orphanedProcesses = 'warning';
            } else {
                this.healthReport.checks.orphanedProcesses = 'healthy';
                console.log(chalk.green('✅ No orphaned processes found'));
            }
        } catch (error) {
            // No processes found, which is good
            this.healthReport.checks.orphanedProcesses = 'healthy';
            console.log(chalk.green('✅ No orphaned processes found'));
        }
    }

    async checkConfiguration() {
        console.log(chalk.cyan('⚙️  Checking configuration...'));

        const configFiles = [
            { name: 'package.json', required: true },
            { name: 'automatosx.config.yaml', required: false }  // Optional user configuration
        ];

        let healthyConfigs = 0;
        let requiredConfigs = 0;
        let healthyRequiredConfigs = 0;

        for (const { name: configFile, required } of configFiles) {
            if (required) requiredConfigs++;

            const configPath = path.join(this.projectPath, configFile);
            if (await fs.pathExists(configPath)) {
                try {
                    if (configFile.endsWith('.json')) {
                        await fs.readJson(configPath);
                    } else {
                        await fs.readFile(configPath, 'utf8');
                    }
                    healthyConfigs++;
                    if (required) healthyRequiredConfigs++;
                } catch (error) {
                    this.healthReport.errors.push(`Invalid ${configFile}: ${error.message}`);
                }
            } else if (required) {
                this.healthReport.warnings.push(`Missing required configuration file: ${configFile}`);
            }
        }

        this.healthReport.checks.configuration = healthyRequiredConfigs === requiredConfigs ? 'healthy' : 'warning';
        console.log(chalk.green(`✅ ${healthyConfigs}/${configFiles.length} configuration files are valid (${healthyRequiredConfigs}/${requiredConfigs} required)`));
    }

    async checkPortFileConsistency() {
        console.log(chalk.cyan('🔌 Checking port file consistency...'));

        const portFilePath = path.join(this.projectPath, '.defai/memory/server.port');
        const memoryServerFiles = [
            path.join(this.projectPath, '.defai/memory/milvus_server.db'),
            path.join(this.projectPath, '.defai/memory/vectors.jsonl'),
            path.join(this.projectPath, '.defai/memory/index.json')
        ];

        const portFileExists = await fs.pathExists(portFilePath);
        const serverFilesExist = await Promise.all(
            memoryServerFiles.map(file => fs.pathExists(file))
        );

        const hasServerFiles = serverFilesExist.some(exists => exists);

        if (portFileExists && !hasServerFiles) {
            // Port file exists but no server files - likely stale
            this.healthReport.warnings.push('Port file exists but no server data files found');
            await fs.remove(portFilePath);
            this.healthReport.autoFixed.push('Removed orphaned port file');
            console.log(chalk.yellow('⚠️  Removed orphaned port file'));
        }

        this.healthReport.checks.portConsistency = 'healthy';
    }

    calculateOverallHealth() {
        const checks = Object.values(this.healthReport.checks);
        const hasErrors = this.healthReport.errors.length > 0;
        const hasWarnings = this.healthReport.warnings.length > 0;
        const hasErrorChecks = checks.includes('error');

        if (hasErrors || hasErrorChecks) {
            this.healthReport.overall = 'critical';
        } else if (hasWarnings || checks.includes('warning')) {
            this.healthReport.overall = 'warning';
        } else {
            this.healthReport.overall = 'healthy';
        }
    }

    displayHealthReport() {
        console.log(chalk.bold('\n📊 Health Report Summary'));
        console.log('='.repeat(40));

        // Overall status
        const statusColor = this.healthReport.overall === 'healthy' ? 'green' :
                          this.healthReport.overall === 'warning' ? 'yellow' : 'red';
        const statusIcon = this.healthReport.overall === 'healthy' ? '✅' :
                         this.healthReport.overall === 'warning' ? '⚠️' : '❌';

        console.log(chalk[statusColor](`${statusIcon} Overall Health: ${this.healthReport.overall.toUpperCase()}`));

        // Individual checks
        console.log(chalk.bold('\n🔍 Individual Checks:'));
        for (const [check, status] of Object.entries(this.healthReport.checks)) {
            const checkIcon = status === 'healthy' ? '✅' : status === 'warning' ? '⚠️' :
                            status === 'fixed' ? '🔧' : '❌';
            console.log(`  ${checkIcon} ${check}: ${status}`);
        }

        // Auto-fixes
        if (this.healthReport.autoFixed.length > 0) {
            console.log(chalk.bold('\n🔧 Auto-Fixes Applied:'));
            this.healthReport.autoFixed.forEach(fix => {
                console.log(chalk.green(`  ✅ ${fix}`));
            });
        }

        // Warnings
        if (this.healthReport.warnings.length > 0) {
            console.log(chalk.bold('\n⚠️  Warnings:'));
            this.healthReport.warnings.forEach(warning => {
                console.log(chalk.yellow(`  ⚠️  ${warning}`));
            });
        }

        // Errors
        if (this.healthReport.errors.length > 0) {
            console.log(chalk.bold('\n❌ Errors:'));
            this.healthReport.errors.forEach(error => {
                console.log(chalk.red(`  ❌ ${error}`));
            });
        }

        console.log(chalk.gray(`\n🕒 Report generated: ${this.healthReport.timestamp}`));
    }

    async saveReport() {
        const reportPath = path.join(this.projectPath, '.defai/health-report.json');
        await fs.ensureDir(path.dirname(reportPath));
        await fs.writeJson(reportPath, this.healthReport, { spaces: 2 });
        console.log(chalk.gray(`📄 Report saved to: ${reportPath}`));
    }
}

// Run health check if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const checker = new SystemHealthChecker();

    checker.runHealthCheck()
        .then(async (report) => {
            await checker.saveReport();

            // Exit with appropriate code
            const exitCode = report.overall === 'critical' ? 1 : 0;
            process.exit(exitCode);
        })
        .catch(error => {
            console.error(chalk.red('💥 Health check crashed:'), error);
            process.exit(1);
        });
}

export { SystemHealthChecker };