#!/usr/bin/env node

/**
 * AutomatosX Workflow CLI
 * Bob's implementation of Tony's multi-agent workflow system
 *
 * Usage:
 *   npm start workflow security-fix "authentication system"
 *   npm start workflow feature-development "user dashboard"
 */

import chalk from 'chalk';
import { EnhancedAutomatosXRouter } from '../core/enhanced-router.js';

class WorkflowCLI {
    constructor() {
        this.router = new EnhancedAutomatosXRouter();
    }

    async run(args) {
        try {
            if (args.length === 0) {
                this.showHelp();
                return;
            }

            const command = args[0];

            switch (command) {
                case 'list':
                    await this.listWorkflows();
                    break;

                case 'status':
                    await this.showStatus(args[1]);
                    break;

                case 'security-fix':
                    await this.runSecurityFix(args[1]);
                    break;

                case 'feature-development':
                    await this.runFeatureDevelopment(args[1]);
                    break;

                case 'custom':
                    await this.runCustomWorkflow(args[1], args[2]);
                    break;

                default:
                    console.log(chalk.red(`❌ Unknown workflow command: ${command}`));
                    this.showHelp();
            }

        } catch (error) {
            console.error(chalk.red('❌ Workflow execution failed:'), error.message);
            process.exit(1);
        }
    }

    async listWorkflows() {
        console.log(chalk.blue('🔗 **AutomatosX Workflow Patterns**\n'));

        await this.router.initialize();
        const patterns = this.router.getWorkflowPatterns();

        patterns.forEach(pattern => {
            console.log(chalk.cyan(`📋 **${pattern.name}** (${pattern.key})`));
            console.log(chalk.gray(`   ${pattern.description}`));
            console.log(chalk.gray(`   Steps: ${pattern.steps}\n`));
        });

        console.log(chalk.yellow('💡 **Usage Examples:**'));
        console.log('   npm start workflow security-fix "authentication system"');
        console.log('   npm start workflow feature-development "user dashboard"');
        console.log('   npm start workflow list');
        console.log('   npm start workflow status <workflow-id>\n');
    }

    async runSecurityFix(target) {
        if (!target) {
            console.log(chalk.red('❌ Please specify a system to analyze'));
            console.log(chalk.yellow('Usage: npm start workflow security-fix "authentication system"'));
            return;
        }

        console.log(chalk.blue('🔐 **Security Fix Workflow**'));
        console.log(chalk.gray(`🎯 Target: ${target}`));
        console.log(chalk.gray('📋 Flow: Security Analysis → Backend Implementation → Quality Verification\n'));

        const result = await this.router.securityFixWorkflow(target);

        console.log(chalk.green('\n✅ **Workflow Completed Successfully!**'));
        console.log(`🆔 Workflow ID: ${result.workflowId}`);
        console.log(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`);
        console.log(`📊 Status: ${result.status}`);

        if (result.results && result.results.length > 0) {
            console.log(chalk.blue('\n📋 **Step Results:**'));
            result.results.forEach((step, index) => {
                const status = step.success ? '✅' : '❌';
                console.log(`   ${status} Step ${step.step}: ${step.agent} (${step.duration}ms)`);
            });
        }

        console.log(chalk.gray(`\n📁 Results saved in .defai/workspaces/workflows/${result.workflowId}/`));
    }

    async runFeatureDevelopment(feature) {
        if (!feature) {
            console.log(chalk.red('❌ Please specify a feature to develop'));
            console.log(chalk.yellow('Usage: npm start workflow feature-development "user dashboard"'));
            return;
        }

        console.log(chalk.blue('🚀 **Feature Development Workflow**'));
        console.log(chalk.gray(`🎯 Feature: ${feature}`));
        console.log(chalk.gray('📋 Flow: PRD → Architecture → Backend → Frontend → Quality\n'));

        const result = await this.router.featureDevelopmentWorkflow(feature);

        console.log(chalk.green('\n✅ **Workflow Completed Successfully!**'));
        console.log(`🆔 Workflow ID: ${result.workflowId}`);
        console.log(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`);
        console.log(`📊 Status: ${result.status}`);

        if (result.results && result.results.length > 0) {
            console.log(chalk.blue('\n📋 **Step Results:**'));
            result.results.forEach((step, index) => {
                const status = step.success ? '✅' : '❌';
                console.log(`   ${status} Step ${step.step}: ${step.agent} (${step.duration}ms)`);
            });
        }

        console.log(chalk.gray(`\n📁 Results saved in .defai/workspaces/workflows/${result.workflowId}/`));
    }

    async runCustomWorkflow(workflowType, target) {
        if (!workflowType || !target) {
            console.log(chalk.red('❌ Please specify workflow type and target'));
            console.log(chalk.yellow('Usage: npm start workflow custom <workflow-type> "<target>"'));
            return;
        }

        console.log(chalk.blue(`🔧 **Custom Workflow: ${workflowType}**`));
        console.log(chalk.gray(`🎯 Target: ${target}\n`));

        const result = await this.router.executeWorkflow(workflowType, target);

        console.log(chalk.green('\n✅ **Workflow Completed Successfully!**'));
        console.log(`🆔 Workflow ID: ${result.workflowId}`);
        console.log(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`);
        console.log(`📊 Status: ${result.status}`);

        console.log(chalk.gray(`\n📁 Results saved in .defai/workspaces/workflows/${result.workflowId}/`));
    }

    async showStatus(workflowId) {
        if (!workflowId) {
            console.log(chalk.red('❌ Please specify a workflow ID'));
            console.log(chalk.yellow('Usage: npm start workflow status <workflow-id>'));
            return;
        }

        await this.router.initialize();
        const status = this.router.getWorkflowStatus(workflowId);

        if (status.status === 'not_found') {
            console.log(chalk.red(`❌ Workflow not found: ${workflowId}`));
            return;
        }

        console.log(chalk.blue('📊 **Workflow Status**\n'));
        console.log(`🆔 ID: ${status.id}`);
        console.log(`📋 Pattern: ${status.pattern}`);
        console.log(`🎯 Target: ${status.target}`);
        console.log(`📊 Status: ${status.status}`);
        console.log(`📈 Progress: ${status.currentStep}/${status.totalSteps} steps`);

        if (status.status === 'running') {
            console.log(`⏱️  Running for: ${Math.round(status.duration / 1000)}s`);
        }
    }

    showHelp() {
        console.log(chalk.blue('🔗 **AutomatosX Workflow System**'));
        console.log(chalk.gray('Bob\'s implementation of Tony\'s multi-agent orchestration\n'));

        console.log(chalk.cyan('📋 **Available Commands:**'));
        console.log('   list                              - List all available workflows');
        console.log('   security-fix "<system>"           - Security analysis → fix → verify');
        console.log('   feature-development "<feature>"   - Full feature development pipeline');
        console.log('   custom <type> "<target>"          - Run custom workflow pattern');
        console.log('   status <workflow-id>              - Check workflow status\n');

        console.log(chalk.cyan('💡 **Examples:**'));
        console.log('   npm start workflow list');
        console.log('   npm start workflow security-fix "authentication system"');
        console.log('   npm start workflow feature-development "user dashboard"');
        console.log('   npm start workflow status abc-123-def\n');

        console.log(chalk.cyan('🔄 **Workflow Patterns:**'));
        console.log('   🔐 security-fix       : Security → Backend → Quality');
        console.log('   🚀 feature-development: PRD → Architect → Backend → Frontend → Quality\n');

        console.log(chalk.yellow('🎯 **Tony\'s Vision Implemented:**'));
        console.log('   • Intelligent agent chaining with conditional execution');
        console.log('   • Milvus-powered context sharing between agents');
        console.log('   • Complete workflow tracking and results preservation');
        console.log('   • Scalable pattern system for custom workflows');
    }
}

async function main() {
    const args = process.argv.slice(2);
    const cli = new WorkflowCLI();
    await cli.run(args);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { WorkflowCLI };
