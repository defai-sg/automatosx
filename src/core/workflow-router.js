#!/usr/bin/env node

/**
 * AutomatosX Workflow Router
 * Bob's implementation of Tony's multi-agent workflow design
 *
 * Enables intelligent agent chaining:
 * security → backend → quality (based on conditions)
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { ChatHistoryManager } from './chat-history.js';

export class WorkflowRouter {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.chatHistory = new ChatHistoryManager(projectPath);
        this.workflowsPath = path.join(projectPath, '.defai/workspaces/workflows');
        this.activeWorkflows = new Map();

        // Predefined workflow patterns
        this.workflowPatterns = {
            'security-fix': {
                name: 'Security Analysis & Fix',
                description: 'Security analyzes → Backend implements → Quality verifies',
                steps: [
                    {
                        agent: 'security',
                        role: 'analysis',
                        task_template: 'Analyze ${target} for security vulnerabilities. Create detailed report with specific recommendations. Do NOT implement code - analysis only.',
                        output_format: 'security_report',
                        next_condition: 'has_vulnerabilities'
                    },
                    {
                        agent: 'backend',
                        role: 'implementation',
                        task_template: 'Implement security fixes based on analysis: ${previous_output.summary}. Create actual code, tests, and documentation.',
                        input_dependency: 'security_report',
                        output_format: 'implementation_result',
                        next_condition: 'implementation_successful'
                    },
                    {
                        agent: 'quality',
                        role: 'validation',
                        task_template: 'Verify security fixes. Original issues: ${context.security_issues}. Implementation: ${context.implementation}. Ensure all resolved.',
                        input_dependency: 'implementation_result',
                        output_format: 'quality_report',
                        final_step: true
                    }
                ]
            },

            'feature-development': {
                name: 'Full Feature Development',
                description: 'Product defines → Architect designs → Backend + Frontend implement → Quality tests',
                steps: [
                    {
                        agent: 'product',
                        task_template: 'Define comprehensive requirements for ${target}. Include user stories, acceptance criteria, and technical constraints.'
                    },
                    {
                        agent: 'architect',
                        task_template: 'Design system architecture for ${target} based on requirements: ${previous_output}'
                    },
                    {
                        agent: 'backend',
                        task_template: 'Implement backend services for ${target}. Architecture: ${context.architecture}'
                    },
                    {
                        agent: 'frontend',
                        task_template: 'Implement user interface for ${target}. Backend API: ${context.backend_api}'
                    },
                    {
                        agent: 'quality',
                        task_template: 'End-to-end testing for ${target}. Verify all requirements met.',
                        final_step: true
                    }
                ]
            }
        };

        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        await fs.ensureDir(this.workflowsPath);
        await this.chatHistory.initialize();

        console.log(chalk.blue('🔗 Workflow Router initialized'));
        this.initialized = true;
    }

    /**
     * Execute a predefined workflow pattern
     */
    async executeWorkflow(patternName, target, options = {}) {
        if (!this.initialized) await this.initialize();

        const pattern = this.workflowPatterns[patternName];
        if (!pattern) {
            throw new Error(`Unknown workflow pattern: ${patternName}`);
        }

        const workflowId = crypto.randomUUID();
        const workflowDir = path.join(this.workflowsPath, workflowId);
        await fs.ensureDir(workflowDir);

        console.log(chalk.blue(`🚀 Starting Workflow: ${pattern.name}`));
        console.log(chalk.gray(`   Target: ${target}`));
        console.log(chalk.gray(`   ID: ${workflowId}`));
        console.log(chalk.gray(`   Pattern: ${pattern.description}\n`));

        const workflowState = {
            id: workflowId,
            pattern: patternName,
            target,
            startTime: Date.now(),
            status: 'running',
            currentStep: 0,
            steps: pattern.steps,
            context: { target },
            results: [],
            options
        };

        this.activeWorkflows.set(workflowId, workflowState);

        try {
            await this.executeWorkflowSteps(workflowState);
            workflowState.status = 'completed';
            workflowState.endTime = Date.now();

            console.log(chalk.green(`✅ Workflow completed: ${workflowId}`));
            await this.saveWorkflowResults(workflowState);

            return {
                workflowId,
                status: 'completed',
                results: workflowState.results,
                duration: workflowState.endTime - workflowState.startTime
            };

        } catch (error) {
            workflowState.status = 'failed';
            workflowState.error = error.message;
            workflowState.endTime = Date.now();

            console.log(chalk.red(`❌ Workflow failed: ${error.message}`));
            await this.saveWorkflowResults(workflowState);

            throw error;
        } finally {
            this.activeWorkflows.delete(workflowId);
        }
    }

    /**
     * Execute workflow steps sequentially with condition checking
     */
    async executeWorkflowSteps(workflowState) {
        for (let i = 0; i < workflowState.steps.length; i++) {
            const step = workflowState.steps[i];
            workflowState.currentStep = i;

            console.log(chalk.cyan(`📋 Step ${i + 1}/${workflowState.steps.length}: ${step.agent}`));

            // Build task from template
            const task = this.buildTaskFromTemplate(step.task_template, workflowState.context);

            // Execute agent task
            const stepResult = await this.executeAgentTask(step.agent, task, workflowState.id);

            // Store result
            stepResult.step = i + 1;
            stepResult.agent = step.agent;
            stepResult.role = step.role;
            workflowState.results.push(stepResult);

            // Update context for next step
            this.updateWorkflowContext(workflowState, stepResult, step);

            // Check if we should continue to next step
            if (step.next_condition && !this.evaluateCondition(step.next_condition, stepResult)) {
                console.log(chalk.yellow(`⏭️  Condition not met: ${step.next_condition}. Skipping remaining steps.`));
                break;
            }

            if (step.final_step) {
                console.log(chalk.green(`🏁 Final step completed`));
                break;
            }

            // Brief pause between steps
            if (i < workflowState.steps.length - 1) {
                console.log(chalk.gray('   Preparing next step...\n'));
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    /**
     * Execute a single agent task using the existing routing system
     */
    async executeAgentTask(agentName, task, workflowId) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            console.log(chalk.gray(`   Executing: ${agentName} - ${task.substring(0, 60)}...`));

            // Use existing agent router
            const agentProcess = spawn('node', [
                'src/scripts/agent-router.js',
                agentName,
                task
            ], {
                cwd: this.projectPath,
                stdio: ['inherit', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            agentProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            agentProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            agentProcess.on('close', (code) => {
                const endTime = Date.now();
                const duration = endTime - startTime;

                if (code === 0) {
                    console.log(chalk.green(`   ✅ ${agentName} completed (${duration}ms)`));

                    resolve({
                        success: true,
                        agent: agentName,
                        task,
                        duration,
                        output: stdout,
                        workflowId,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    console.log(chalk.red(`   ❌ ${agentName} failed (code ${code})`));

                    reject(new Error(`Agent ${agentName} failed with code ${code}: ${stderr}`));
                }
            });

            agentProcess.on('error', (error) => {
                console.log(chalk.red(`   ❌ ${agentName} error: ${error.message}`));
                reject(error);
            });
        });
    }

    /**
     * Build task string from template with context substitution
     */
    buildTaskFromTemplate(template, context) {
        let task = template;

        // Simple template substitution
        task = task.replace(/\$\{target\}/g, context.target);
        task = task.replace(/\$\{previous_output\.summary\}/g, context.previous_summary || 'No previous output');
        task = task.replace(/\$\{context\.(\w+)\}/g, (match, key) => {
            return context[key] || `[${key} not available]`;
        });

        return task;
    }

    /**
     * Update workflow context based on step results
     */
    updateWorkflowContext(workflowState, stepResult, step) {
        // Extract summary from agent output (simple implementation)
        const summary = this.extractSummary(stepResult.output);
        workflowState.context.previous_summary = summary;
        workflowState.context[`${step.agent}_output`] = stepResult.output;

        // Store specific outputs based on step configuration
        if (step.output_format) {
            workflowState.context[step.output_format] = stepResult;
        }
    }

    /**
     * Evaluate conditions to determine workflow flow
     */
    evaluateCondition(condition, stepResult) {
        switch (condition) {
            case 'has_vulnerabilities':
                // Simple heuristic: check if output mentions vulnerabilities
                return /vulnerability|security|risk|issue|problem/i.test(stepResult.output);

            case 'implementation_successful':
                return stepResult.success && !/error|failed|cannot/i.test(stepResult.output);

            default:
                return true; // Default to continue
        }
    }

    /**
     * Extract summary from agent output (simple implementation)
     */
    extractSummary(output) {
        // Extract first meaningful line that's not just metadata
        const lines = output.split('\n').filter(line =>
            line.trim() &&
            !line.includes('📝') &&
            !line.includes('✅') &&
            !line.includes('🎭')
        );

        return lines[0] || 'Task completed';
    }

    /**
     * Save workflow results to file system
     */
    async saveWorkflowResults(workflowState) {
        const workflowDir = path.join(this.workflowsPath, workflowState.id);
        const resultsFile = path.join(workflowDir, 'workflow-results.json');

        const results = {
            id: workflowState.id,
            pattern: workflowState.pattern,
            target: workflowState.target,
            status: workflowState.status,
            startTime: workflowState.startTime,
            endTime: workflowState.endTime,
            duration: workflowState.endTime - workflowState.startTime,
            steps_completed: workflowState.results.length,
            total_steps: workflowState.steps.length,
            results: workflowState.results,
            error: workflowState.error
        };

        await fs.writeJSON(resultsFile, results, { spaces: 2 });

        // Also store in Milvus for searchability
        await this.chatHistory.storeConversation({
            role: 'workflow',
            message: `Workflow ${workflowState.pattern} completed for ${workflowState.target}`,
            context: results,
            metadata: {
                type: 'workflow_completion',
                workflowId: workflowState.id,
                pattern: workflowState.pattern,
                status: workflowState.status
            }
        });
    }

    /**
     * Get workflow status
     */
    getWorkflowStatus(workflowId) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            return { status: 'not_found' };
        }

        return {
            id: workflowId,
            pattern: workflow.pattern,
            target: workflow.target,
            status: workflow.status,
            currentStep: workflow.currentStep + 1,
            totalSteps: workflow.steps.length,
            startTime: workflow.startTime,
            duration: Date.now() - workflow.startTime
        };
    }

    /**
     * List available workflow patterns
     */
    listWorkflowPatterns() {
        return Object.entries(this.workflowPatterns).map(([key, pattern]) => ({
            key,
            name: pattern.name,
            description: pattern.description,
            steps: pattern.steps.length
        }));
    }
}

export default WorkflowRouter;
