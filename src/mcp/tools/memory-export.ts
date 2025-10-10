/**
 * MCP Tool: memory_export
 *
 * Exports all memory entries to a JSON file.
 */

import type {
  ToolHandler,
  MemoryExportInput,
  MemoryExportOutput
} from '../types.js';
import type { IMemoryManager } from '../../types/memory.js';
import { logger } from '../../utils/logger.js';
import { resolve } from 'path';

export interface MemoryExportDependencies {
  memoryManager: IMemoryManager;
}

export function createMemoryExportHandler(
  deps: MemoryExportDependencies
): ToolHandler<MemoryExportInput, MemoryExportOutput> {
  return async (input: MemoryExportInput): Promise<MemoryExportOutput> => {
    logger.info('[MCP] memory_export called', { input });

    try {
      const { path } = input;

      // Resolve path relative to current working directory
      const absolutePath = resolve(process.cwd(), path);

      // Export memories to JSON file
      const exported = await deps.memoryManager.exportToJSON(absolutePath);

      const result: MemoryExportOutput = {
        success: true,
        path: absolutePath,
        entries: exported.entriesExported
      };

      logger.info('[MCP] memory_export completed', {
        path: absolutePath,
        entries: exported.entriesExported
      });

      return result;
    } catch (error) {
      logger.error('[MCP] memory_export failed', { error });
      throw new Error(`Memory export failed: ${(error as Error).message}`);
    }
  };
}
