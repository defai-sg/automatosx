/**
 * MCP Tool: memory_import
 *
 * Imports memory entries from a JSON file.
 */

import type {
  ToolHandler,
  MemoryImportInput,
  MemoryImportOutput
} from '../types.js';
import type { IMemoryManager } from '../../types/memory.js';
import { logger } from '../../utils/logger.js';
import { resolve } from 'path';

export interface MemoryImportDependencies {
  memoryManager: IMemoryManager;
}

export function createMemoryImportHandler(
  deps: MemoryImportDependencies
): ToolHandler<MemoryImportInput, MemoryImportOutput> {
  return async (input: MemoryImportInput): Promise<MemoryImportOutput> => {
    logger.info('[MCP] memory_import called', { input });

    try {
      const { path } = input;

      // Resolve path relative to current working directory
      const absolutePath = resolve(process.cwd(), path);

      // Import memories from JSON file
      const imported = await deps.memoryManager.importFromJSON(absolutePath);

      const result: MemoryImportOutput = {
        success: true,
        imported: imported.entriesImported,
        skipped: imported.entriesSkipped
      };

      logger.info('[MCP] memory_import completed', {
        path: absolutePath,
        imported: imported.entriesImported,
        skipped: imported.entriesSkipped
      });

      return result;
    } catch (error) {
      logger.error('[MCP] memory_import failed', { error });
      throw new Error(`Memory import failed: ${(error as Error).message}`);
    }
  };
}
