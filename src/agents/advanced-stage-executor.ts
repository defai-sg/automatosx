/**
 * Advanced Stage Executor - Phase 3 Features
 *
 * Advanced features for multi-stage execution:
 * - Parallel execution of independent stages
 * - Conditional stage execution
 * - Stage dependency graph resolution
 * - Memory persistence with embeddings
 * - Streaming stage output
 * - Dependency visualization
 */

import type { ExecutionContext, Stage } from '../types/agent.js';
import type { IMemoryManager } from '../types/memory.js';
import { StageExecutor } from './stage-executor.js';
import type {
  StageExecutionResult,
  MultiStageExecutionResult,
  StageExecutionOptions
} from './stage-executor.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Stage execution plan node
 */
interface StageNode {
  stage: Stage;
  index: number;
  dependencies: string[];
  level: number; // Execution level (0 = no deps, 1 = depends on level 0, etc.)
}

/**
 * Execution timeline entry
 */
interface TimelineEntry {
  stageName: string;
  startTime: number;
  endTime: number;
  duration: number;
  level: number;
}

/**
 * Advanced Stage Executor
 *
 * Extends StageExecutor with:
 * - Dependency resolution
 * - Parallel execution
 * - Conditional execution
 * - Memory persistence
 */
export class AdvancedStageExecutor extends StageExecutor {
  /**
   * Execute stages with advanced features
   */
  async executeAdvanced(
    context: ExecutionContext,
    options: StageExecutionOptions = {}
  ): Promise<MultiStageExecutionResult> {
    const stages = context.agent.stages || [];

    if (stages.length === 0) {
      throw new Error('Agent has no stages defined');
    }

    // Build dependency graph
    const graph = this.buildDependencyGraph(stages);

    // Check for circular dependencies
    this.detectCircularDependencies(graph);

    // Check if any stages support parallel execution
    const hasParallelStages = stages.some(s => s.parallel);

    if (!hasParallelStages) {
      // Fallback to sequential execution
      logger.info('No parallel stages detected, using sequential execution');
      return this.executeStages(context, options);
    }

    // Execute with parallel support
    return this.executeWithParallel(context, graph, options);
  }

  /**
   * Build dependency graph from stages
   */
  private buildDependencyGraph(stages: Stage[]): StageNode[] {
    const graph: StageNode[] = [];

    // First pass: create nodes
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (!stage) continue;

      graph.push({
        stage,
        index: i,
        dependencies: stage.dependencies || [],
        level: 0 // Will be calculated
      });
    }

    // Second pass: calculate execution levels
    this.calculateLevels(graph);

    return graph;
  }

  /**
   * Calculate execution level for each stage
   * Level 0 = no dependencies, Level N = depends on stages at level N-1
   */
  private calculateLevels(graph: StageNode[]): void {
    const maxIterations = graph.length;
    let iteration = 0;

    while (iteration < maxIterations) {
      let changed = false;

      for (const node of graph) {
        if (node.dependencies.length === 0) {
          node.level = 0;
          continue;
        }

        // Find max level of dependencies
        let maxDepLevel = -1;
        for (const depName of node.dependencies) {
          const depNode = graph.find(n => n.stage.name === depName);
          if (depNode) {
            maxDepLevel = Math.max(maxDepLevel, depNode.level);
          }
        }

        const newLevel = maxDepLevel + 1;
        if (newLevel !== node.level) {
          node.level = newLevel;
          changed = true;
        }
      }

      if (!changed) break;
      iteration++;
    }
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(graph: StageNode[]): void {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (nodeName: string): void => {
      if (visiting.has(nodeName)) {
        throw new Error(`Circular dependency detected involving stage: ${nodeName}`);
      }

      if (visited.has(nodeName)) {
        return;
      }

      visiting.add(nodeName);

      const node = graph.find(n => n.stage.name === nodeName);
      if (node) {
        for (const dep of node.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(nodeName);
      visited.add(nodeName);
    };

    for (const node of graph) {
      visit(node.stage.name);
    }
  }

  /**
   * Execute stages with parallel support
   */
  private async executeWithParallel(
    context: ExecutionContext,
    graph: StageNode[],
    options: StageExecutionOptions
  ): Promise<MultiStageExecutionResult> {
    const { verbose = false, memoryManager = null, continueOnFailure = false } = options;

    // Group stages by execution level
    const maxLevel = Math.max(...graph.map(n => n.level));
    const levelGroups: StageNode[][] = [];

    for (let level = 0; level <= maxLevel; level++) {
      levelGroups.push(graph.filter(n => n.level === level));
    }

    if (verbose) {
      console.log(chalk.cyan('\n📊 Execution Plan:'));
      for (let level = 0; level <= maxLevel; level++) {
        const nodesAtLevel = levelGroups[level];
        if (!nodesAtLevel) continue;

        console.log(chalk.gray(`  Level ${level}: ${nodesAtLevel.map(n => n.stage.name).join(', ')}`));
      }
      console.log();
    }

    const allResults: StageExecutionResult[] = [];
    const stageOutputs = new Map<string, string>(); // stageName -> output
    const stageResults = new Map<string, StageExecutionResult>(); // stageName -> result
    const timeline: TimelineEntry[] = [];
    const startTime = Date.now();

    // Execute level by level
    for (let level = 0; level <= maxLevel; level++) {
      const nodesAtLevel = levelGroups[level];
      if (!nodesAtLevel || nodesAtLevel.length === 0) continue;

      if (verbose) {
        console.log(chalk.cyan(`\n▶ Executing Level ${level} (${nodesAtLevel.length} stage${nodesAtLevel.length > 1 ? 's' : ''})...\n`));
      }

      // Check which stages can run in parallel
      const parallelNodes = nodesAtLevel.filter(n => n.stage.parallel);
      const sequentialNodes = nodesAtLevel.filter(n => !n.stage.parallel);

      // Execute parallel stages
      if (parallelNodes.length > 0) {
        const parallelPromises = parallelNodes.map(node =>
          this.executeNode(node, context, stageOutputs, stageResults, options, timeline)
        );

        const parallelResults = await Promise.all(parallelPromises);
        allResults.push(...parallelResults);

        // Store outputs and results (skip '[Skipped due to condition]' outputs)
        for (const result of parallelResults) {
          stageResults.set(result.stageName, result);
          if (result.success && result.output !== '[Skipped due to condition]') {
            stageOutputs.set(result.stageName, result.output);
          }
        }

        // Check for failures in parallel stages
        if (!continueOnFailure) {
          const failedStage = parallelResults.find(r => !r.success);
          if (failedStage) {
            logger.warn('Parallel stage failed, stopping execution', {
              stage: failedStage.stageName
            });
            // Skip remaining levels
            const totalDuration = Date.now() - startTime;
            const totalTokens = allResults.reduce((sum, r) => sum + r.tokensUsed, 0);
            return {
              stages: allResults,
              totalDuration,
              totalTokens,
              success: false,
              failedStage: allResults.findIndex(r => !r.success),
              finalOutput: this.assembleFinalOutput(allResults)
            };
          }
        }
      }

      // Execute sequential stages
      for (const node of sequentialNodes) {
        const result = await this.executeNode(node, context, stageOutputs, stageResults, options, timeline);
        allResults.push(result);

        stageResults.set(result.stageName, result);
        if (result.success && result.output !== '[Skipped due to condition]') {
          stageOutputs.set(result.stageName, result.output);
        } else if (!result.success && !continueOnFailure) {
          // Stage failed and continueOnFailure is false
          logger.warn('Sequential stage failed, stopping execution', {
            stage: result.stageName
          });
          // Skip remaining levels
          const totalDuration = Date.now() - startTime;
          const totalTokens = allResults.reduce((sum, r) => sum + r.tokensUsed, 0);
          return {
            stages: allResults,
            totalDuration,
            totalTokens,
            success: false,
            failedStage: allResults.findIndex(r => !r.success),
            finalOutput: this.assembleFinalOutput(allResults)
          };
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const totalTokens = allResults.reduce((sum, r) => sum + r.tokensUsed, 0);
    const success = allResults.every(r => r.success);
    const failedStageIndex = allResults.findIndex(r => !r.success);

    // Generate final output
    const finalOutput = this.assembleFinalOutput(allResults);

    return {
      stages: allResults,
      totalDuration,
      totalTokens,
      success,
      failedStage: failedStageIndex >= 0 ? failedStageIndex : undefined,
      finalOutput
    };
  }

  /**
   * Execute a single stage node
   */
  private async executeNode(
    node: StageNode,
    context: ExecutionContext,
    stageOutputs: Map<string, string>,
    stageResults: Map<string, StageExecutionResult>,
    options: StageExecutionOptions,
    timeline: TimelineEntry[]
  ): Promise<StageExecutionResult> {
    const { stage } = node;
    const { verbose = false, memoryManager = null } = options;

    // Check if all dependencies succeeded
    for (const dep of node.dependencies) {
      const depResult = stageResults.get(dep);
      if (!depResult) {
        // Dependency hasn't been executed yet (shouldn't happen with proper dependency graph)
        if (verbose) {
          console.log(chalk.red(`⚠ Skipping stage "${stage.name}" (dependency "${dep}" not executed)\n`));
        }
        return {
          stageName: stage.name,
          stageIndex: node.index,
          output: `[Skipped: dependency "${dep}" not executed]`,
          duration: 0,
          tokensUsed: 0,
          success: false,
          error: new Error(`Dependency "${dep}" not executed`)
        };
      }

      if (!depResult.success) {
        // Dependency failed
        if (verbose) {
          console.log(chalk.yellow(`⊘ Skipping stage "${stage.name}" (dependency "${dep}" failed)\n`));
        }
        return {
          stageName: stage.name,
          stageIndex: node.index,
          output: `[Skipped: dependency "${dep}" failed]`,
          duration: 0,
          tokensUsed: 0,
          success: false,
          error: new Error(`Dependency "${dep}" failed`)
        };
      }
    }

    // Check condition
    if (stage.condition) {
      const shouldExecute = this.evaluateCondition(stage.condition, stageOutputs, stageResults);
      if (!shouldExecute) {
        if (verbose) {
          console.log(chalk.yellow(`⊘ Skipping stage "${stage.name}" (condition not met)\n`));
        }

        return {
          stageName: stage.name,
          stageIndex: node.index,
          output: '[Skipped due to condition]',
          duration: 0,
          tokensUsed: 0,
          success: true
        };
      }
    }

    // Build context from dependencies
    const previousOutputs: string[] = [];
    for (const dep of node.dependencies) {
      const output = stageOutputs.get(dep);
      if (output) {
        previousOutputs.push(output);
      }
    }

    // Execute stage
    const stageStartTime = Date.now();

    try {
      const result = await this.executeStageInternal(
        stage,
        node.index,
        context,
        previousOutputs,
        options
      );

      const stageEndTime = Date.now();

      // Record timeline
      timeline.push({
        stageName: stage.name,
        startTime: stageStartTime,
        endTime: stageEndTime,
        duration: stageEndTime - stageStartTime,
        level: node.level
      });

      // Save to memory if requested
      if (stage.saveToMemory && result.success && memoryManager) {
        await this.saveStageToMemory(
          context.agent.name,
          stage,
          result,
          memoryManager
        );
      }

      return result;

    } catch (error) {
      return {
        stageName: stage.name,
        stageIndex: node.index,
        output: '',
        duration: Date.now() - stageStartTime,
        tokensUsed: 0,
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Execute stage internal (copied from parent but made accessible)
   */
  private async executeStageInternal(
    stage: Stage,
    index: number,
    context: ExecutionContext,
    previousOutputs: string[],
    options: { verbose?: boolean; showProgress?: boolean }
  ): Promise<StageExecutionResult> {
    // Call parent's private method via public interface
    // Note: This is a workaround - in production we'd refactor StageExecutor
    const allStages = context.agent.stages || [];
    const tempContext = { ...context, agent: { ...context.agent, stages: [stage] } };

    // Build prompt manually
    const prompt = this.buildStagePromptManual(stage, context.task, previousOutputs, allStages);

    const startTime = Date.now();
    const response = await context.provider.execute({
      prompt,
      systemPrompt: context.agent.systemPrompt,
      model: stage.model || context.agent.model,
      temperature: stage.temperature ?? context.agent.temperature,
      maxTokens: context.agent.maxTokens
    });

    const duration = Date.now() - startTime;

    return {
      stageName: stage.name,
      stageIndex: index,
      output: response.content,
      duration,
      tokensUsed: response.tokensUsed?.total ?? 0,
      success: true,
      model: stage.model || context.agent.model
    };
  }

  /**
   * Build stage prompt manually
   */
  private buildStagePromptManual(
    stage: Stage,
    originalTask: string,
    previousOutputs: string[],
    allStages: Stage[]
  ): string {
    let prompt = '';

    prompt += `# Current Stage: ${stage.name}\n\n`;
    prompt += `${stage.description}\n\n`;

    if (stage.key_questions && stage.key_questions.length > 0) {
      prompt += `## Key Questions to Address\n\n`;
      stage.key_questions.forEach(q => {
        prompt += `- ${q}\n`;
      });
      prompt += `\n`;
    }

    if (stage.outputs && stage.outputs.length > 0) {
      prompt += `## Expected Outputs\n\n`;
      stage.outputs.forEach(o => {
        prompt += `- ${o}\n`;
      });
      prompt += `\n`;
    }

    prompt += `## Original Task\n\n${originalTask}\n\n`;

    if (previousOutputs.length > 0) {
      prompt += `## Context from Previous Stages\n\n`;
      previousOutputs.forEach((output, i) => {
        prompt += `### Previous Stage ${i + 1}\n\n${output}\n\n`;
      });
    }

    prompt += `## Your Task\n\n`;
    prompt += `Focus on completing **${stage.name}** based on the context above.\n`;

    return prompt;
  }

  /**
   * Evaluate condition string
   * Simple implementation - supports basic conditions
   */
  private evaluateCondition(
    condition: string,
    stageOutputs: Map<string, string>,
    stageResults: Map<string, StageExecutionResult>
  ): boolean {
    // Simple condition evaluation
    // Example: "previous.success" or "data_fetch.success"

    if (condition === 'previous.success') {
      // Check if all previous stages succeeded
      if (stageResults.size === 0) {
        return false;
      }
      // Check if any stage failed
      for (const result of stageResults.values()) {
        if (!result.success && result.output !== '[Skipped due to condition]') {
          return false;
        }
      }
      return true;
    }

    // Check specific stage success
    const match = condition.match(/^(\w+)\.success$/);
    if (match && match[1]) {
      const stageName = match[1];
      const result = stageResults.get(stageName);
      return result !== undefined && result.success;
    }

    // Default: execute the stage
    return true;
  }

  /**
   * Generate dependency graph visualization (ASCII art)
   */
  visualizeDependencyGraph(stages: Stage[]): string {
    const graph = this.buildDependencyGraph(stages);
    let output = '\n' + chalk.cyan('📊 Stage Dependency Graph\n\n');

    const maxLevel = Math.max(...graph.map(n => n.level));

    for (let level = 0; level <= maxLevel; level++) {
      const nodesAtLevel = graph.filter(n => n.level === level);

      output += chalk.gray(`Level ${level}:\n`);

      for (const node of nodesAtLevel) {
        const parallel = node.stage.parallel ? chalk.green(' [parallel]') : '';
        const condition = node.stage.condition ? chalk.yellow(` [if: ${node.stage.condition}]`) : '';

        output += `  ${chalk.cyan('○')} ${node.stage.name}${parallel}${condition}\n`;

        // Show dependencies
        if (node.dependencies.length > 0) {
          output += chalk.gray(`     ↳ depends on: ${node.dependencies.join(', ')}\n`);
        }
      }

      output += '\n';
    }

    return output;
  }

  /**
   * Generate execution timeline visualization
   */
  visualizeTimeline(timeline: TimelineEntry[]): string {
    let output = '\n' + chalk.cyan('⏱️  Execution Timeline\n\n');

    const maxLevel = Math.max(...timeline.map(t => t.level));
    const totalDuration = Math.max(...timeline.map(t => t.endTime)) - Math.min(...timeline.map(t => t.startTime));

    for (let level = 0; level <= maxLevel; level++) {
      const entriesAtLevel = timeline.filter(t => t.level === level);

      output += chalk.gray(`Level ${level}:\n`);

      for (const entry of entriesAtLevel) {
        const bar = '█'.repeat(Math.max(1, Math.floor((entry.duration / totalDuration) * 40)));
        output += `  ${entry.stageName.padEnd(20)} ${chalk.green(bar)} ${entry.duration}ms\n`;
      }

      output += '\n';
    }

    return output;
  }
}
