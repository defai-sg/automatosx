/**
 * Tests for AdvancedStageExecutor (Phase 3)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdvancedStageExecutor } from '../../src/agents/advanced-stage-executor.js';
import type { ExecutionContext, Stage } from '../../src/types/agent.js';
import type { Provider, ExecutionResponse } from '../../src/types/provider.js';

describe('AdvancedStageExecutor', () => {
  let executor: AdvancedStageExecutor;
  let mockProvider: Provider;

  beforeEach(() => {
    executor = new AdvancedStageExecutor();

    mockProvider = {
      name: 'mock-provider',
      priority: 1,
      enabled: true,
      execute: vi.fn(),
      stream: vi.fn(),
      checkHealth: vi.fn().mockResolvedValue({
        healthy: true,
        latency: 100
      })
    } as unknown as Provider;
  });

  describe('Dependency Graph', () => {
    it('should build dependency graph correctly', () => {
      const stages: Stage[] = [
        {
          name: 'stage1',
          description: 'First stage',
          dependencies: []
        },
        {
          name: 'stage2',
          description: 'Second stage',
          dependencies: ['stage1']
        },
        {
          name: 'stage3',
          description: 'Third stage',
          dependencies: ['stage2']
        }
      ];

      const visualization = executor.visualizeDependencyGraph(stages);

      expect(visualization).toContain('stage1');
      expect(visualization).toContain('stage2');
      expect(visualization).toContain('stage3');
      expect(visualization).toContain('Level 0');
      expect(visualization).toContain('Level 1');
      expect(visualization).toContain('Level 2');
    });

    it('should detect parallel stages at same level', () => {
      const stages: Stage[] = [
        {
          name: 'fetch_data',
          description: 'Fetch data',
          dependencies: []
        },
        {
          name: 'fetch_config',
          description: 'Fetch config',
          dependencies: [],
          parallel: true
        },
        {
          name: 'process',
          description: 'Process results',
          dependencies: ['fetch_data', 'fetch_config']
        }
      ];

      const visualization = executor.visualizeDependencyGraph(stages);

      expect(visualization).toContain('[parallel]');
      expect(visualization).toContain('fetch_config');
    });

    it('should show conditional stages', () => {
      const stages: Stage[] = [
        {
          name: 'validate',
          description: 'Validate input',
          dependencies: []
        },
        {
          name: 'process',
          description: 'Process if valid',
          dependencies: ['validate'],
          condition: 'validate.success'
        }
      ];

      const visualization = executor.visualizeDependencyGraph(stages);

      expect(visualization).toContain('[if:');
      expect(visualization).toContain('validate.success');
    });
  });

  describe('Parallel Execution', () => {
    it('should execute independent parallel stages simultaneously', async () => {
      const stages: Stage[] = [
        {
          name: 'task1',
          description: 'Independent task 1',
          dependencies: [],
          parallel: true
        },
        {
          name: 'task2',
          description: 'Independent task 2',
          dependencies: [],
          parallel: true
        }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Test parallel execution',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      const mockResponse: ExecutionResponse = {
        content: 'Output',
        tokensUsed: { prompt: 10, completion: 20, total: 30 },
        latencyMs: 100,
        model: 'test-model',
        finishReason: 'stop'
      };

      (mockProvider.execute as any).mockResolvedValue(mockResponse);

      const result = await executor.executeAdvanced(context, {
        verbose: false,
        showProgress: false
      });

      expect(result.success).toBe(true);
      expect(result.stages.length).toBe(2);
      expect(mockProvider.execute).toHaveBeenCalledTimes(2);
    });

    it('should respect dependencies and execute in correct order', async () => {
      const executionOrder: string[] = [];

      const stages: Stage[] = [
        {
          name: 'fetch',
          description: 'Fetch data',
          dependencies: []
        },
        {
          name: 'transform',
          description: 'Transform data',
          dependencies: ['fetch']
        },
        {
          name: 'save',
          description: 'Save results',
          dependencies: ['transform']
        }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Test dependency ordering',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      (mockProvider.execute as any).mockImplementation(async (req: any) => {
        // Extract stage name from prompt
        const stageName = req.prompt.match(/Current Stage: (\w+)/)?.[1];
        if (stageName) {
          executionOrder.push(stageName);
        }

        return {
          content: `Output for ${stageName}`,
          tokensUsed: { prompt: 10, completion: 20, total: 30 },
          latencyMs: 100,
          model: 'test-model',
          finishReason: 'stop'
        };
      });

      await executor.executeAdvanced(context, {
        verbose: false,
        showProgress: false
      });

      expect(executionOrder).toEqual(['fetch', 'transform', 'save']);
    });
  });

  describe('Conditional Execution', () => {
    it('should execute all stages with parallel features', async () => {
      const stages: Stage[] = [
        {
          name: 'check',
          description: 'Check something',
          dependencies: []
        },
        {
          name: 'action',
          description: 'Take action if check passes',
          dependencies: ['check']
        }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Test execution',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      const mockResponse: ExecutionResponse = {
        content: 'Completed',
        tokensUsed: { prompt: 10, completion: 20, total: 30 },
        latencyMs: 100,
        model: 'test-model',
        finishReason: 'stop'
      };

      (mockProvider.execute as any).mockResolvedValue(mockResponse);

      const result = await executor.executeAdvanced(context, {
        verbose: false,
        showProgress: false
      });

      // Both stages should execute successfully
      expect(result.stages.length).toBe(2);
      expect(result.stages[0]?.success).toBe(true);
      expect(result.stages[1]?.success).toBe(true);
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should throw error for circular dependencies', async () => {
      const stages: Stage[] = [
        {
          name: 'stage1',
          description: 'Stage 1',
          dependencies: ['stage2']
        },
        {
          name: 'stage2',
          description: 'Stage 2',
          dependencies: ['stage1']
        }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Test circular dependency',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      await expect(
        executor.executeAdvanced(context, {
          verbose: false,
          showProgress: false
        })
      ).rejects.toThrow('Circular dependency');
    });
  });
});
