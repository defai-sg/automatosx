/**
 * OpenAI Embedding Provider
 */

import type {
  IEmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingResponse,
  EmbeddingErrorCode
} from '../types/embedding.js';
import { EmbeddingError } from '../types/embedding.js';

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * OpenAI Embedding Provider implementation
 */
export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private config: Required<EmbeddingProviderConfig>;

  constructor(config: EmbeddingProviderConfig) {
    if (!config.apiKey) {
      throw new EmbeddingError(
        'OpenAI API key is required',
        'API_KEY_MISSING'
      );
    }

    this.config = {
      provider: 'openai',
      apiKey: config.apiKey,
      model: config.model ?? DEFAULT_MODEL,
      dimensions: config.dimensions ?? DEFAULT_DIMENSIONS,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelay: config.retryDelay ?? DEFAULT_RETRY_DELAY
    };
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string): Promise<EmbeddingResponse> {
    if (!text || text.trim().length === 0) {
      throw new EmbeddingError(
        'Text cannot be empty',
        'INVALID_TEXT'
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest([text]);
        const firstData = response.data[0];
        if (!firstData) {
          throw new Error('No embedding data returned');
        }
        return {
          embedding: firstData.embedding,
          model: response.model,
          dimensions: this.config.dimensions,
          usage: {
            promptTokens: response.usage.prompt_tokens,
            totalTokens: response.usage.total_tokens
          }
        };
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw this.wrapError(error);
        }

        // Wait before retry
        if (attempt < this.config.maxRetries - 1) {
          await this.sleep(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    throw new EmbeddingError(
      `Failed after ${this.config.maxRetries} attempts: ${lastError?.message}`,
      'PROVIDER_ERROR',
      { error: lastError }
    );
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResponse[]> {
    if (texts.length === 0) {
      return [];
    }

    // Validate all texts
    for (const text of texts) {
      if (!text || text.trim().length === 0) {
        throw new EmbeddingError(
          'All texts must be non-empty',
          'INVALID_TEXT'
        );
      }
    }

    try {
      const response = await this.makeRequest(texts);

      return response.data.map((item: { embedding: number[] }) => ({
        embedding: item.embedding,
        model: response.model,
        dimensions: this.config.dimensions,
        usage: {
          promptTokens: response.usage.prompt_tokens / texts.length,
          totalTokens: response.usage.total_tokens / texts.length
        }
      }));
    } catch (error) {
      throw new EmbeddingError(
        `Batch embedding failed: ${(error as Error).message}`,
        'BATCH_ERROR',
        { error, count: texts.length }
      );
    }
  }

  /**
   * Get provider info
   */
  getInfo(): { provider: string; model: string; dimensions: number } {
    return {
      provider: 'openai',
      model: this.config.model,
      dimensions: this.config.dimensions
    };
  }

  /**
   * Make API request to OpenAI
   */
  private async makeRequest(texts: string[]): Promise<{
    data: Array<{ embedding: number[] }>;
    model: string;
    usage: { prompt_tokens: number; total_tokens: number };
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          input: texts,
          model: this.config.model,
          dimensions: this.config.dimensions
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json() as { error?: { message?: string } };
        throw new Error(error.error?.message ?? `HTTP ${response.status}`);
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>;
        model: string;
        usage: { prompt_tokens: number; total_tokens: number };
      };
      return data;
    } catch (error) {
      clearTimeout(timeout);
      throw error as Error;
    }
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: unknown): boolean {
    const message = (error as Error).message.toLowerCase();
    return (
      message.includes('invalid') ||
      message.includes('api key') ||
      message.includes('unauthorized') ||
      message.includes('403') ||
      message.includes('401')
    );
  }

  /**
   * Wrap native error as EmbeddingError
   */
  private wrapError(error: unknown): EmbeddingError {
    const message = (error as Error).message;
    let code: EmbeddingErrorCode = 'PROVIDER_ERROR';

    if (message.includes('rate limit')) {
      code = 'RATE_LIMIT_EXCEEDED';
    } else if (message.includes('api key') || message.includes('unauthorized')) {
      code = 'API_KEY_MISSING';
    }

    return new EmbeddingError(message, code, { error });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
