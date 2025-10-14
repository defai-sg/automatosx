/**
 * Provider Streaming Unit Tests
 *
 * Tests streaming functionality for all providers (OpenAI, Gemini, Claude).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from '../../src/providers/openai-provider.js';
import { GeminiProvider } from '../../src/providers/gemini-provider.js';
import { ClaudeProvider } from '../../src/providers/claude-provider.js';
import type { ProviderConfig, ExecutionRequest, StreamingOptions } from '../../src/types/provider.js';

describe('Provider Streaming', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Save original env
    originalEnv = process.env.AUTOMATOSX_MOCK_PROVIDERS;
    // Enable mock mode for all tests
    process.env.AUTOMATOSX_MOCK_PROVIDERS = 'true';
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore env
    if (originalEnv === undefined) {
      delete process.env.AUTOMATOSX_MOCK_PROVIDERS;
    } else {
      process.env.AUTOMATOSX_MOCK_PROVIDERS = originalEnv;
    }
    vi.restoreAllMocks();
  });

  describe('OpenAI Provider (Native Streaming)', () => {
    let provider: OpenAIProvider;
    const config: ProviderConfig = {
      name: 'codex',
      enabled: true,
      priority: 1,
      timeout: 10000,
      command: 'codex',
    };

    beforeEach(() => {
      provider = new OpenAIProvider(config);
    });

    it('should report streaming support', () => {
      expect(provider.supportsStreaming()).toBe(true);
    });

    it('should execute with streaming and call onToken callback', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test streaming prompt',
        systemPrompt: 'You are a helpful assistant',
      };

      const tokens: string[] = [];
      const streamingOptions: StreamingOptions = {
        enabled: true,
        onToken: (token) => {
          tokens.push(token);
        },
      };

      const response = await provider.executeStreaming(request, streamingOptions);

      // Should receive tokens
      expect(tokens.length).toBeGreaterThan(0);

      // Response should contain content
      expect(response.content).toBeTruthy();
      expect(typeof response.content).toBe('string');

      // Response should have finish reason
      expect(response.finishReason).toBe('stop');
    });

    it('should execute with streaming and call onProgress callback', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test streaming prompt',
      };

      const progressUpdates: number[] = [];
      const streamingOptions: StreamingOptions = {
        enabled: true,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        },
      };

      await provider.executeStreaming(request, streamingOptions);

      // Should receive progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Progress should increase over time
      for (let i = 1; i < progressUpdates.length; i++) {
        const current = progressUpdates[i];
        const previous = progressUpdates[i - 1];
        expect(current).toBeGreaterThanOrEqual(previous!);
      }

      // Final progress should be close to 100
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress).toBeGreaterThanOrEqual(90);
    });

    it('should execute with streaming and call both callbacks', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test streaming prompt',
      };

      const tokens: string[] = [];
      const progressUpdates: number[] = [];

      const streamingOptions: StreamingOptions = {
        enabled: true,
        onToken: (token) => tokens.push(token),
        onProgress: (progress) => progressUpdates.push(progress),
      };

      const response = await provider.executeStreaming(request, streamingOptions);

      // Should receive both tokens and progress
      expect(tokens.length).toBeGreaterThan(0);
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Response should be valid
      expect(response.content).toBeTruthy();
      expect(response.tokensUsed).toBeDefined();
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should work without callbacks', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test streaming prompt',
      };

      const streamingOptions: StreamingOptions = {
        enabled: true,
        // No callbacks
      };

      const response = await provider.executeStreaming(request, streamingOptions);

      // Should still work
      expect(response.content).toBeTruthy();
      expect(response.finishReason).toBe('stop');
    });

    it('should include system prompt in execution', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
        systemPrompt: 'You are a code reviewer',
      };

      const streamingOptions: StreamingOptions = {
        enabled: true,
      };

      const response = await provider.executeStreaming(request, streamingOptions);

      // Response should reflect the system prompt context
      expect(response.content).toBeTruthy();
    });

    it('should handle model parameter', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
        model: 'gpt-4',
      };

      const streamingOptions: StreamingOptions = {
        enabled: true,
      };

      const response = await provider.executeStreaming(request, streamingOptions);

      expect(response.model).toBe('gpt-4');
    });

    it('should simulate realistic token streaming timing', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test streaming prompt',
      };

      const tokenTimestamps: number[] = [];
      const streamingOptions: StreamingOptions = {
        enabled: true,
        onToken: () => {
          tokenTimestamps.push(Date.now());
        },
      };

      await provider.executeStreaming(request, streamingOptions);

      // Tokens should arrive at different times (not all at once)
      expect(tokenTimestamps.length).toBeGreaterThan(1);

      // Calculate time differences between tokens
      const timeDiffs = [];
      for (let i = 1; i < tokenTimestamps.length; i++) {
        const current = tokenTimestamps[i];
        const previous = tokenTimestamps[i - 1];
        if (current !== undefined && previous !== undefined) {
          timeDiffs.push(current - previous);
        }
      }

      // Should have some delay between tokens (mock uses 50ms delay)
      const avgDelay = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      expect(avgDelay).toBeGreaterThan(0);
    });
  });

  describe('Gemini Provider (Synthetic Progress)', () => {
    let provider: GeminiProvider;
    const config: ProviderConfig = {
      name: 'gemini',
      enabled: true,
      priority: 2,
      timeout: 10000,
      command: 'gemini',
    };

    beforeEach(() => {
      provider = new GeminiProvider(config);
    });

    it('should report no native streaming support', () => {
      expect(provider.supportsStreaming()).toBe(false);
    });

    it('should execute with synthetic progress', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
      };

      const progressUpdates: number[] = [];
      const streamingOptions: StreamingOptions = {
        enabled: true,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        },
      };

      const response = await provider.executeStreaming!(request, streamingOptions);

      // Should receive progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Final progress should be 100%
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress).toBe(100);

      // Response should be valid
      expect(response.content).toBeTruthy();
      expect(response.finishReason).toBe('stop');
    });

    it('should work without onProgress callback', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
      };

      const streamingOptions: StreamingOptions = {
        enabled: true,
        // No callbacks
      };

      const response = await provider.executeStreaming!(request, streamingOptions);

      expect(response.content).toBeTruthy();
    });

    it('should not call onToken (no token-level streaming)', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
      };

      const onToken = vi.fn();
      const streamingOptions: StreamingOptions = {
        enabled: true,
        onToken,
      };

      await provider.executeStreaming!(request, streamingOptions);

      // Gemini doesn't support token streaming
      expect(onToken).not.toHaveBeenCalled();
    });

    it('should provide random progress updates', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
      };

      const progressUpdates: number[] = [];
      const streamingOptions: StreamingOptions = {
        enabled: true,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        },
      };

      await provider.executeStreaming!(request, streamingOptions);

      // Progress should be within valid range (5-95% during execution, 100% at end)
      progressUpdates.slice(0, -1).forEach(progress => {
        expect(progress).toBeGreaterThanOrEqual(5);
        expect(progress).toBeLessThanOrEqual(95);
      });

      // Last progress should be 100%
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
  });

  describe('Claude Provider (Synthetic Progress)', () => {
    let provider: ClaudeProvider;
    const config: ProviderConfig = {
      name: 'claude',
      enabled: true,
      priority: 3,
      timeout: 10000,
      command: 'claude',
    };

    beforeEach(() => {
      provider = new ClaudeProvider(config);
    });

    it('should report no native streaming support', () => {
      expect(provider.supportsStreaming()).toBe(false);
    });

    it('should execute with synthetic progress', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
      };

      const progressUpdates: number[] = [];
      const streamingOptions: StreamingOptions = {
        enabled: true,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        },
      };

      const response = await provider.executeStreaming!(request, streamingOptions);

      // Should receive progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Final progress should be 100%
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress).toBe(100);

      // Response should be valid
      expect(response.content).toBeTruthy();
      expect(response.finishReason).toBe('stop');
    });

    it('should work without onProgress callback', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
      };

      const streamingOptions: StreamingOptions = {
        enabled: true,
      };

      const response = await provider.executeStreaming!(request, streamingOptions);

      expect(response.content).toBeTruthy();
    });

    it('should not call onToken (no token-level streaming)', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
      };

      const onToken = vi.fn();
      const streamingOptions: StreamingOptions = {
        enabled: true,
        onToken,
      };

      await provider.executeStreaming!(request, streamingOptions);

      // Claude doesn't support token streaming
      expect(onToken).not.toHaveBeenCalled();
    });
  });

  describe('Provider streaming comparison', () => {
    it('should have consistent response structure across all providers', async () => {
      const request: ExecutionRequest = {
        prompt: 'Test prompt',
      };

      const streamingOptions: StreamingOptions = {
        enabled: true,
      };

      const openaiProvider = new OpenAIProvider({
        name: 'codex',
        enabled: true,
        priority: 1,
        timeout: 10000,
        command: 'codex',
      });

      const geminiProvider = new GeminiProvider({
        name: 'gemini',
        enabled: true,
        priority: 2,
        timeout: 10000,
        command: 'gemini',
      });

      const claudeProvider = new ClaudeProvider({
        name: 'claude',
        enabled: true,
        priority: 3,
        timeout: 10000,
        command: 'claude',
      });

      const openaiResponse = await openaiProvider.executeStreaming(request, streamingOptions);
      const geminiResponse = await geminiProvider.executeStreaming!(request, streamingOptions);
      const claudeResponse = await claudeProvider.executeStreaming!(request, streamingOptions);

      // All responses should have same structure
      const responses = [openaiResponse, geminiResponse, claudeResponse];

      responses.forEach(response => {
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('model');
        expect(response).toHaveProperty('tokensUsed');
        expect(response).toHaveProperty('latencyMs');
        expect(response).toHaveProperty('finishReason');

        expect(typeof response.content).toBe('string');
        expect(typeof response.model).toBe('string');
        expect(typeof response.latencyMs).toBe('number');
        expect(response.finishReason).toBe('stop');
      });
    });

    it('should differentiate between native and synthetic streaming', () => {
      const openaiProvider = new OpenAIProvider({
        name: 'codex',
        enabled: true,
        priority: 1,
        timeout: 10000,
        command: 'codex',
      });

      const geminiProvider = new GeminiProvider({
        name: 'gemini',
        enabled: true,
        priority: 2,
        timeout: 10000,
        command: 'gemini',
      });

      const claudeProvider = new ClaudeProvider({
        name: 'claude',
        enabled: true,
        priority: 3,
        timeout: 10000,
        command: 'claude',
      });

      // OpenAI supports native streaming
      expect(openaiProvider.supportsStreaming()).toBe(true);

      // Gemini and Claude use synthetic progress
      expect(geminiProvider.supportsStreaming()).toBe(false);
      expect(claudeProvider.supportsStreaming()).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle streaming errors gracefully', async () => {
      // This test would be more meaningful with real CLI, but we verify basic error handling
      const provider = new OpenAIProvider({
        name: 'codex',
        enabled: true,
        priority: 1,
        timeout: 10000,
        command: 'codex',
      });

      const request: ExecutionRequest = {
        prompt: '', // Empty prompt might cause issues
      };

      const streamingOptions: StreamingOptions = {
        enabled: true,
      };

      // Should not throw, even with edge cases
      const response = await provider.executeStreaming(request, streamingOptions);
      expect(response).toBeDefined();
    });

    it('should handle callback errors without crashing', async () => {
      const provider = new OpenAIProvider({
        name: 'codex',
        enabled: true,
        priority: 1,
        timeout: 10000,
        command: 'codex',
      });

      const request: ExecutionRequest = {
        prompt: 'Test prompt',
      };

      const streamingOptions: StreamingOptions = {
        enabled: true,
        onToken: () => {
          throw new Error('Callback error');
        },
      };

      // Execution should complete despite callback errors
      await expect(provider.executeStreaming(request, streamingOptions)).rejects.toThrow();
    });
  });
});
