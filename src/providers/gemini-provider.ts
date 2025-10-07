/**
 * GeminiProvider - Google Gemini AI Provider
 *
 * Uses Google Generative AI SDK for Gemini models
 */

import { BaseProvider } from './base-provider.js';
import type {
  ProviderConfig,
  ProviderCapabilities,
  ExecutionRequest,
  ExecutionResponse,
  EmbeddingOptions,
  Cost
} from '../types/provider.js';

export class GeminiProvider extends BaseProvider {
  private readonly DEFAULT_MODEL = 'gemini-2.0-flash-exp';

  constructor(config: ProviderConfig) {
    super(config);
  }

  get name(): string {
    return 'gemini';
  }

  get version(): string {
    return '1.0.0';
  }

  get capabilities(): ProviderCapabilities {
    return {
      supportsStreaming: false,
      supportsEmbedding: true,
      supportsVision: true,
      maxContextTokens: 1000000, // Gemini 1.5 Pro has 1M context window
      supportedModels: [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro'
      ]
    };
  }

  protected async executeRequest(request: ExecutionRequest): Promise<ExecutionResponse> {
    const startTime = Date.now();
    const model = request.model || this.DEFAULT_MODEL;

    try {
      // Build prompt with system prompt if provided
      let fullPrompt = request.prompt;
      if (request.systemPrompt) {
        fullPrompt = `${request.systemPrompt}\n\n${request.prompt}`;
      }

      // Execute via CLI (placeholder - actual implementation will use SDK)
      const response = await this.executeCLI(fullPrompt, model, request);

      const latency = Date.now() - startTime;

      return {
        content: response.content,
        model: model,
        tokensUsed: {
          prompt: this.estimateTokens(fullPrompt),
          completion: this.estimateTokens(response.content),
          total: this.estimateTokens(fullPrompt) + this.estimateTokens(response.content)
        },
        latencyMs: latency,
        finishReason: 'stop'
      };
    } catch (error) {
      throw new Error(`Gemini execution failed: ${(error as Error).message}`);
    }
  }

  protected async generateEmbeddingInternal(text: string, options?: EmbeddingOptions): Promise<number[]> {
    // Gemini supports embeddings via embedding-001 model
    const model = options?.model || 'embedding-001';

    try {
      // TODO: Implement actual embedding generation with Google AI SDK
      // For now, return mock embedding
      const dimensions = options?.dimensions || 768;
      return Array(dimensions).fill(0).map(() => Math.random());
    } catch (error) {
      throw new Error(`Gemini embedding generation failed: ${(error as Error).message}`);
    }
  }

  override async estimateCost(request: ExecutionRequest): Promise<Cost> {
    const model = request.model || this.DEFAULT_MODEL;

    // Gemini pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-2.0-flash-exp': { input: 0, output: 0 },  // Free during preview
      'gemini-1.5-pro': { input: 3.50, output: 10.50 },  // per 1M tokens
      'gemini-1.5-flash': { input: 0.35, output: 1.05 },
      'gemini-1.0-pro': { input: 0.50, output: 1.50 }
    };

    const modelPricing = pricing[model] ?? pricing[this.DEFAULT_MODEL];
    if (!modelPricing) {
      throw new Error(`Unknown model: ${model}`);
    }

    const inputTokens = this.estimateTokens(request.prompt);
    const outputTokens = request.maxTokens ?? 4096;

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return {
      estimatedUsd: inputCost + outputCost,
      tokensUsed: inputTokens + outputTokens
    };
  }

  // CLI execution helper (Phase 1 implementation)
  private async executeCLI(prompt: string, model: string, request: ExecutionRequest): Promise<{ content: string }> {
    // Check if running in production mode (real CLI) or test mode (mock)
    const useMock = process.env.AUTOMATOSX_MOCK_PROVIDERS === 'true';

    if (useMock) {
      // Mock mode for testing
      return Promise.resolve({
        content: `[Mock Response from Gemini ${model}]\n\nTask received: ${prompt.substring(0, 100)}...\n\nThis is a placeholder response. Set AUTOMATOSX_MOCK_PROVIDERS=false to use real CLI.`
      });
    }

    // Real CLI execution
    return this.executeRealCLI(prompt, model, request);
  }

  /**
   * Execute real CLI command via spawn
   */
  private async executeRealCLI(prompt: string, model: string, request: ExecutionRequest): Promise<{ content: string }> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // Build CLI arguments for Gemini CLI
      // Note: Gemini CLI uses positional prompt, not --prompt flag
      // Model is set via -m/--model flag
      const args: string[] = [];

      // Add model if specified
      if (model && model !== this.DEFAULT_MODEL) {
        args.push('--model', model);
      }

      // Add prompt as positional argument (not as flag)
      args.push(prompt);

      // Note: Gemini CLI doesn't support temperature and maxTokens via CLI flags
      // These parameters are configured in the Gemini settings.json instead

      // Spawn the CLI process
      const child = spawn(this.config.command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });

      // Collect stdout
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process exit
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Gemini CLI exited with code ${code}: ${stderr}`));
        } else {
          resolve({ content: stdout.trim() });
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        reject(new Error(`Failed to spawn Gemini CLI: ${error.message}`));
      });

      // Set timeout
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('Gemini CLI execution timeout'));
      }, this.config.timeout);

      child.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  override shouldRetry(error: Error): boolean {
    // Gemini-specific retry logic
    const geminiRetryableErrors = [
      'resource_exhausted',
      'unavailable',
      'deadline_exceeded',
      'internal',
      'rate_limit'
    ];

    const message = error.message.toLowerCase();
    return geminiRetryableErrors.some(err => message.includes(err)) || super.shouldRetry(error);
  }
}
