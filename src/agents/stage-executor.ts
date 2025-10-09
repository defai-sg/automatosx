/**
 * Stage Executor - Multi-Stage Agent Execution
 *
 * Executes agents with multiple stages (workflow steps) in sequence.
 * Each stage builds on the outputs of previous stages.
 *
 * Features:
 * - Sequential stage execution
 * - Context accumulation (previous outputs fed to next stage)
 * - Per-stage configuration (model, temperature)
 * - Progress tracking
 * - Stage failure handling
 * - Memory persistence between stages
 */

import type { ExecutionContext, Stage } from '../types/agent.js';
import type { ExecutionResponse } from '../types/provider.js';
import type { IMemoryManager } from '../types/memory.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Result of a single stage execution
 */
export interface StageExecutionResult {
  stageName: string;
  stageIndex: number;
  output: string;
  duration: number;
  tokensUsed: number;
  success: boolean;
  error?: Error;
  model?: string;
}

/**
 * Complete multi-stage execution result
 */
export interface MultiStageExecutionResult {
  stages: StageExecutionResult[];
  totalDuration: number;
  totalTokens: number;
  success: boolean;
  failedStage?: number;
  finalOutput: string;
}

/**
 * Options for stage execution
 */
export interface StageExecutionOptions {
  verbose?: boolean;
  showProgress?: boolean;
  continueOnFailure?: boolean;
  saveToMemory?: boolean;
  memoryManager?: IMemoryManager | null;
}

/**
 * Stage Executor
 *
 * Executes agents with multi-stage workflows where each stage:
 * 1. Receives context from previous stages
 * 2. Executes with stage-specific configuration
 * 3. Produces output for next stages
 * 4. Can optionally save to memory
 */
export class StageExecutor {
  /**
   * Execute all stages of an agent workflow
   */
  async executeStages(
    context: ExecutionContext,
    options: StageExecutionOptions = {}
  ): Promise<MultiStageExecutionResult> {
    const {
      verbose = false,
      showProgress = true,
      continueOnFailure = false,
      saveToMemory = false,
      memoryManager = null
    } = options;

    const stages = context.agent.stages || [];

    if (stages.length === 0) {
      throw new Error('Agent has no stages defined');
    }

    logger.info('Starting multi-stage execution', {
      agent: context.agent.name,
      stageCount: stages.length
    });

    const stageResults: StageExecutionResult[] = [];
    const previousOutputs: string[] = [];
    const startTime = Date.now();

    // Execute each stage sequentially
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      // TypeScript strict mode: ensure stage exists
      if (!stage) {
        logger.error('Stage is undefined', { index: i });
        continue;
      }

      if (verbose) {
        console.log(chalk.cyan(`\n${'='.repeat(60)}`));
        console.log(chalk.cyan(`Stage ${i + 1}/${stages.length}: ${stage.name}`));
        console.log(chalk.cyan(`${'='.repeat(60)}\n`));
        console.log(chalk.gray(`Description: ${stage.description}`));
        console.log();
      }

      try {
        // Execute stage
        const result = await this.executeStage(
          stage,
          i,
          context,
          previousOutputs,
          { verbose, showProgress }
        );

        stageResults.push(result);

        // Save output for next stages
        if (result.success) {
          previousOutputs.push(result.output);

          // Optionally save to memory
          if (saveToMemory && memoryManager) {
            await this.saveStageToMemory(
              context.agent.name,
              stage,
              result,
              memoryManager
            );
          }
        } else {
          // Stage failed
          if (!continueOnFailure) {
            logger.warn('Stage failed, stopping execution', {
              stage: stage.name,
              index: i
            });
            break;
          } else {
            logger.warn('Stage failed, continuing to next stage', {
              stage: stage.name,
              index: i
            });
          }
        }

      } catch (error) {
        const failedResult: StageExecutionResult = {
          stageName: stage.name,
          stageIndex: i,
          output: '',
          duration: 0,
          tokensUsed: 0,
          success: false,
          error: error as Error
        };

        stageResults.push(failedResult);

        if (!continueOnFailure) {
          logger.error('Stage execution failed, stopping', {
            stage: stage.name,
            error: (error as Error).message
          });
          break;
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const totalTokens = stageResults.reduce((sum, r) => sum + r.tokensUsed, 0);
    const success = stageResults.every(r => r.success);
    const failedStageIndex = stageResults.findIndex(r => !r.success);
    const finalOutput = this.assembleFinalOutput(stageResults);

    const result: MultiStageExecutionResult = {
      stages: stageResults,
      totalDuration,
      totalTokens,
      success,
      failedStage: failedStageIndex >= 0 ? failedStageIndex : undefined,
      finalOutput
    };

    logger.info('Multi-stage execution complete', {
      totalStages: stages.length,
      successfulStages: stageResults.filter(r => r.success).length,
      totalDuration,
      totalTokens,
      success
    });

    return result;
  }

  /**
   * Execute a single stage
   */
  private async executeStage(
    stage: Stage,
    index: number,
    context: ExecutionContext,
    previousOutputs: string[],
    options: { verbose?: boolean; showProgress?: boolean }
  ): Promise<StageExecutionResult> {
    const { verbose = false, showProgress = true } = options;

    // Build stage-specific prompt
    const prompt = this.buildStagePrompt(
      stage,
      context.task,
      previousOutputs,
      context.agent.stages || []
    );

    // Create spinner
    const spinner = showProgress
      ? ora({
          text: `Executing stage: ${stage.name}`,
          spinner: 'dots'
        }).start()
      : null;

    try {
      const startTime = Date.now();

      // Execute via provider with stage-specific config
      const response = await context.provider.execute({
        prompt,
        systemPrompt: context.agent.systemPrompt,
        model: stage.model || context.agent.model,
        temperature: stage.temperature ?? context.agent.temperature,
        maxTokens: context.agent.maxTokens
      });

      const duration = Date.now() - startTime;

      // Stop spinner
      if (spinner) {
        spinner.succeed(`Stage complete: ${stage.name} (${duration}ms)`);
      }

      if (verbose) {
        console.log(chalk.green('\n✓ Stage output:'));
        console.log(response.content);
        const tokensUsed = response.tokensUsed?.total ?? 0;
        console.log(chalk.gray(`\nTokens used: ${tokensUsed}`));
        console.log(chalk.gray(`Duration: ${duration}ms`));
      }

      return {
        stageName: stage.name,
        stageIndex: index,
        output: response.content,
        duration,
        tokensUsed: response.tokensUsed?.total ?? 0,
        success: true,
        model: stage.model || context.agent.model
      };

    } catch (error) {
      // Stop spinner with failure
      if (spinner) {
        spinner.fail(`Stage failed: ${stage.name}`);
      }

      if (verbose) {
        console.error(chalk.red(`\n✗ Stage error: ${(error as Error).message}`));
      }

      throw error;
    }
  }

  /**
   * Build prompt for a specific stage
   */
  private buildStagePrompt(
    stage: Stage,
    originalTask: string,
    previousOutputs: string[],
    allStages: Stage[]
  ): string {
    let prompt = '';

    // Add stage context
    prompt += `# Current Stage: ${stage.name}\n\n`;
    prompt += `${stage.description}\n\n`;

    // Add key questions if available
    if (stage.key_questions && stage.key_questions.length > 0) {
      prompt += `## Key Questions to Address\n\n`;
      stage.key_questions.forEach(q => {
        prompt += `- ${q}\n`;
      });
      prompt += `\n`;
    }

    // Add expected outputs if available
    if (stage.outputs && stage.outputs.length > 0) {
      prompt += `## Expected Outputs\n\n`;
      stage.outputs.forEach(o => {
        prompt += `- ${o}\n`;
      });
      prompt += `\n`;
    }

    // Add original task
    prompt += `## Original Task\n\n${originalTask}\n\n`;

    // Add previous stage outputs (context accumulation)
    if (previousOutputs.length > 0) {
      prompt += `## Context from Previous Stages\n\n`;
      previousOutputs.forEach((output, i) => {
        const prevStage = allStages[i];
        if (prevStage) {
          prompt += `### Stage ${i + 1}: ${prevStage.name}\n\n`;
        } else {
          prompt += `### Stage ${i + 1}: Previous Stage\n\n`;
        }
        prompt += `${output}\n\n`;
      });
    }

    // Add focus instruction
    prompt += `## Your Task\n\n`;
    prompt += `Focus on completing **${stage.name}** based on the context above. `;
    prompt += `Build on the previous stages' work and produce the expected outputs for this stage.\n`;

    return prompt;
  }

  /**
   * Assemble final output from all stages
   */
  protected assembleFinalOutput(results: StageExecutionResult[]): string {
    if (results.length === 0) {
      return '';
    }

    // If only one stage, return its output or error
    if (results.length === 1) {
      const result = results[0];
      if (!result) return '';

      if (result.success) {
        return result.output;
      } else {
        // For failed single stage, return error information
        return `# Execution Failed\n\n` +
               `**Stage**: ${result.stageName}\n\n` +
               `**Error**: ${result.error?.message || 'Unknown error'}\n\n` +
               `**Duration**: ${result.duration}ms\n`;
      }
    }

    // Multiple stages: combine outputs
    let output = '# Multi-Stage Execution Results\n\n';

    results.forEach((result, i) => {
      const status = result.success ? '✓' : '✗';
      output += `## Stage ${i + 1}: ${result.stageName} ${status}\n\n`;

      if (result.success) {
        output += `${result.output}\n\n`;
      } else {
        output += `**Failed:** ${result.error?.message || 'Unknown error'}\n\n`;
      }

      output += `---\n\n`;
    });

    return output;
  }

  /**
   * Save stage result to memory
   *
   * v4.11.0: No embedding required (uses FTS5)
   */
  protected async saveStageToMemory(
    agentName: string,
    stage: Stage,
    result: StageExecutionResult,
    memoryManager: IMemoryManager
  ): Promise<void> {
    try {
      const memoryContent = `[${agentName}] Stage: ${stage.name}\n\n${result.output}`;

      // v4.11.0: Save directly without embedding (uses FTS5)
      await memoryManager.add(memoryContent, null, {
        type: 'task',
        source: agentName,
        agentId: agentName,
        stage: stage.name,
        stageIndex: result.stageIndex,
        timestamp: new Date().toISOString(),
        tokensUsed: result.tokensUsed,
        duration: result.duration
      });

      logger.info('Stage result saved to memory', {
        agent: agentName,
        stage: stage.name,
        contentLength: memoryContent.length,
        searchMethod: 'FTS5'
      });

    } catch (error) {
      logger.warn('Failed to save stage to memory', {
        stage: stage.name,
        error: (error as Error).message
      });
      // Don't throw - memory save is optional
    }
  }

  /**
   * Display multi-stage execution result
   */
  displayResult(result: MultiStageExecutionResult, verbose: boolean = false): void {
    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan('Multi-Stage Execution Summary'));
    console.log(chalk.cyan('='.repeat(60)));

    // Summary stats
    const successCount = result.stages.filter(s => s.success).length;
    const statusColor = result.success ? chalk.green : chalk.red;
    const statusIcon = result.success ? '✓' : '✗';

    console.log(statusColor(`\n${statusIcon} Status: ${result.success ? 'Success' : 'Failed'}`));
    console.log(chalk.gray(`Stages completed: ${successCount}/${result.stages.length}`));
    console.log(chalk.gray(`Total duration: ${result.totalDuration}ms`));
    console.log(chalk.gray(`Total tokens: ${result.totalTokens}`));

    if (result.failedStage !== undefined) {
      const failedStageResult = result.stages[result.failedStage];
      if (failedStageResult) {
        console.log(chalk.red(`Failed at stage ${result.failedStage + 1}: ${failedStageResult.stageName}`));
      }
    }

    // Stage details
    if (verbose) {
      console.log(chalk.cyan('\n' + '-'.repeat(60)));
      console.log(chalk.cyan('Stage Details'));
      console.log(chalk.cyan('-'.repeat(60)));

      result.stages.forEach((stage, i) => {
        const icon = stage.success ? '✓' : '✗';
        const color = stage.success ? chalk.green : chalk.red;

        console.log(color(`\n${icon} Stage ${i + 1}: ${stage.stageName}`));
        console.log(chalk.gray(`  Duration: ${stage.duration}ms`));
        console.log(chalk.gray(`  Tokens: ${stage.tokensUsed}`));

        if (stage.model) {
          console.log(chalk.gray(`  Model: ${stage.model}`));
        }

        if (!stage.success && stage.error) {
          console.log(chalk.red(`  Error: ${stage.error.message}`));
        }
      });
    }

    // Final output
    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan('Final Output'));
    console.log(chalk.cyan('='.repeat(60) + '\n'));
    console.log(result.finalOutput);
  }
}
