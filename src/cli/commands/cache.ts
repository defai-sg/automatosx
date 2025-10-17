/**
 * Cache CLI Commands
 *
 * Manage provider response cache (v5.5.3+)
 */

import type { CommandModule } from 'yargs';
import { resolve } from 'path';
import { ResponseCache } from '../../core/response-cache.js';
import { loadConfig } from '../../core/config.js';
import chalk from 'chalk';
import Table from 'cli-table3';
import { printSuccess } from '../../utils/message-formatter.js';

interface BaseCacheArgs {
  db?: string;
}

interface StatsArgs extends BaseCacheArgs {
  output?: 'json' | 'table';
}

interface ClearArgs extends BaseCacheArgs {
  confirm?: boolean;
}

const DEFAULT_CACHE_DB_PATH = '.automatosx/cache/responses.db';

/**
 * Get response cache instance
 */
async function getResponseCache(dbPath?: string): Promise<ResponseCache> {
  const config = await loadConfig(process.cwd());
  const cachePath = dbPath || config.performance?.responseCache?.dbPath || DEFAULT_CACHE_DB_PATH;

  return new ResponseCache({
    enabled: true, // Force enable for CLI commands
    ttl: config.performance?.responseCache?.ttl || 86400,
    maxSize: config.performance?.responseCache?.maxSize || 1000,
    maxMemorySize: config.performance?.responseCache?.maxMemorySize || 100,
    dbPath: resolve(cachePath)
  });
}

/**
 * Cache status command
 * Shows current cache configuration and basic stats
 */
export const statusCommand: CommandModule = {
  command: 'status',
  describe: 'Show response cache status and configuration',
  builder: (yargs) => {
    return (yargs as any)
      .option('output', {
        alias: 'o',
        describe: 'Output format',
        type: 'string',
        choices: ['json', 'table'],
        default: 'table'
      })
      .option('db', {
        describe: 'Cache database path',
        type: 'string'
      });
  },
  handler: async (argv: any) => {
    try {
      const cache = await getResponseCache(argv.db);
      const stats = cache.getStats();
      const config = await loadConfig(process.cwd());

      if (argv.output === 'json') {
        console.log(JSON.stringify({
          config: config.performance?.responseCache,
          stats
        }, null, 2));
      } else {
        // Configuration table
        console.log(chalk.bold('\n📊 Response Cache Configuration:\n'));
        const configTable = new Table({
          head: [chalk.cyan('Setting'), chalk.cyan('Value')],
          colWidths: [30, 50]
        });

        const cacheConfig = config.performance?.responseCache;
        configTable.push(
          ['Enabled', cacheConfig?.enabled ? chalk.green('Yes') : chalk.red('No')],
          ['TTL (Time-to-Live)', `${cacheConfig?.ttl || 86400} seconds (${Math.round((cacheConfig?.ttl || 86400) / 3600)} hours)`],
          ['Max SQLite Entries', `${cacheConfig?.maxSize || 1000}`],
          ['Max Memory Entries', `${cacheConfig?.maxMemorySize || 100}`],
          ['Database Path', cacheConfig?.dbPath || DEFAULT_CACHE_DB_PATH]
        );

        console.log(configTable.toString());

        // Statistics table
        console.log(chalk.bold('\n📈 Cache Statistics:\n'));
        const statsTable = new Table({
          head: [chalk.cyan('Metric'), chalk.cyan('Value')],
          colWidths: [30, 50]
        });

        const hitRate = (stats.hitRate * 100).toFixed(2);
        const hitRateColor = stats.hitRate > 0.5 ? chalk.green : stats.hitRate > 0.2 ? chalk.yellow : chalk.red;

        statsTable.push(
          ['Total Entries', `${stats.totalEntries}`],
          ['L1 (Memory) Entries', `${stats.l1Entries}`],
          ['L2 (SQLite) Entries', `${stats.l2Entries}`],
          ['Total Hits', chalk.green(`${stats.totalHits}`)],
          ['Total Misses', chalk.yellow(`${stats.totalMisses}`)],
          ['Hit Rate', hitRateColor(`${hitRate}%`)],
          ['Total Size', `${(stats.size / 1024 / 1024).toFixed(2)} MB`],
          ['Oldest Entry', stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'N/A'],
          ['Newest Entry', stats.newestEntry ? new Date(stats.newestEntry).toLocaleString() : 'N/A']
        );

        console.log(statsTable.toString());

        if (!stats.enabled) {
          console.log(chalk.yellow('\n⚠ Note: Cache is currently disabled in configuration.'));
          console.log(chalk.gray('To enable: ax config set performance.responseCache.enabled true\n'));
        } else if (stats.totalEntries === 0) {
          console.log(chalk.gray('\n💡 Tip: Cache is empty. Run some tasks to populate it.\n'));
        }
      }

      cache.close();
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to get cache status:'));
      console.error(chalk.gray((error as Error).message));
      process.exit(1);
    }
  }
};

/**
 * Cache stats command (detailed statistics)
 */
export const statsCommand: CommandModule = {
  command: 'stats',
  describe: 'Show detailed cache statistics',
  builder: (yargs) => {
    return (yargs as any)
      .option('output', {
        alias: 'o',
        describe: 'Output format',
        type: 'string',
        choices: ['json', 'table'],
        default: 'table'
      })
      .option('db', {
        describe: 'Cache database path',
        type: 'string'
      });
  },
  handler: async (argv: any) => {
    try {
      const cache = await getResponseCache(argv.db);
      const stats = cache.getStats();

      if (argv.output === 'json') {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log(chalk.bold('\n📊 Cache Statistics:\n'));

        const table = new Table({
          head: [chalk.cyan('Metric'), chalk.cyan('Value')],
          colWidths: [35, 50]
        });

        const hitRate = (stats.hitRate * 100).toFixed(2);
        const totalRequests = stats.totalHits + stats.totalMisses;
        const avgEntrySize = stats.totalEntries > 0 ? stats.size / stats.totalEntries : 0;

        table.push(
          [chalk.bold('Status'), stats.enabled ? chalk.green('Enabled') : chalk.red('Disabled')],
          [''],
          [chalk.bold('Entries'), ''],
          ['  Total Entries', `${stats.totalEntries}`],
          ['  L1 (Memory)', `${stats.l1Entries}`],
          ['  L2 (SQLite)', `${stats.l2Entries}`],
          [''],
          [chalk.bold('Performance'), ''],
          ['  Total Requests', `${totalRequests}`],
          ['  Cache Hits', chalk.green(`${stats.totalHits}`)],
          ['  Cache Misses', chalk.yellow(`${stats.totalMisses}`)],
          ['  Hit Rate', `${hitRate}%`],
          [''],
          [chalk.bold('Storage'), ''],
          ['  Total Size', `${(stats.size / 1024 / 1024).toFixed(2)} MB`],
          ['  Average Entry Size', `${(avgEntrySize / 1024).toFixed(2)} KB`],
          [''],
          [chalk.bold('Timeline'), ''],
          ['  Oldest Entry', stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'N/A'],
          ['  Newest Entry', stats.newestEntry ? new Date(stats.newestEntry).toLocaleString() : 'N/A']
        );

        console.log(table.toString());

        // Performance insights
        console.log(chalk.bold('\n💡 Insights:\n'));
        if (stats.totalEntries === 0) {
          console.log(chalk.gray('  • Cache is empty. Run some tasks to see performance benefits.'));
        } else {
          if (stats.hitRate > 0.5) {
            console.log(chalk.green('  • Excellent hit rate! Cache is working well.'));
          } else if (stats.hitRate > 0.2) {
            console.log(chalk.yellow('  • Moderate hit rate. Consider increasing TTL for better performance.'));
          } else if (totalRequests > 10) {
            console.log(chalk.red('  • Low hit rate. Tasks may be too unique for caching.'));
          }

          if (stats.l1Entries === stats.totalEntries && stats.totalEntries < 50) {
            console.log(chalk.gray('  • All entries in memory (L1). Fast access guaranteed.'));
          }

          if (stats.size > 50 * 1024 * 1024) {
            console.log(chalk.yellow('  • Cache is large. Consider reducing maxSize or TTL.'));
          }
        }

        console.log();
      }

      cache.close();
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to get cache stats:'));
      console.error(chalk.gray((error as Error).message));
      process.exit(1);
    }
  }
};

/**
 * Cache clear command
 */
export const clearCommand: CommandModule = {
  command: 'clear',
  describe: 'Clear all cache entries',
  builder: (yargs) => {
    return (yargs as any)
      .option('confirm', {
        alias: 'y',
        describe: 'Skip confirmation prompt',
        type: 'boolean',
        default: false
      })
      .option('db', {
        describe: 'Cache database path',
        type: 'string'
      });
  },
  handler: async (argv: any) => {
    try {
      const cache = await getResponseCache(argv.db);
      const stats = cache.getStats();

      if (stats.totalEntries === 0) {
        console.log(chalk.yellow('\n⚠ Cache is already empty.\n'));
        cache.close();
        return;
      }

      // Confirm before clearing (unless --confirm flag is used)
      if (!argv.confirm) {
        console.log(chalk.yellow(`\n⚠ This will delete ${stats.totalEntries} cache entries (${(stats.size / 1024 / 1024).toFixed(2)} MB).\n`));
        console.log(chalk.gray('To confirm, run: ax cache clear --confirm\n'));
        cache.close();
        return;
      }

      cache.clear();
      printSuccess(`Cache cleared successfully. Deleted ${stats.totalEntries} entries.`);

      cache.close();
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to clear cache:'));
      console.error(chalk.gray((error as Error).message));
      process.exit(1);
    }
  }
};

/**
 * Cache parent command
 */
export const cacheCommand: CommandModule = {
  command: 'cache <command>',
  describe: 'Manage provider response cache',
  builder: (yargs) => {
    return yargs
      .command(statusCommand)
      .command(statsCommand)
      .command(clearCommand)
      .demandCommand(1, 'Please specify a cache command')
      .help();
  },
  handler: () => {
    // Parent command, subcommands handle execution
  }
};
