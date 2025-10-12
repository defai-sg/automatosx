/**
 * List Command - List agents, abilities, or providers
 */

import type { CommandModule } from 'yargs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { PathResolver, detectProjectRoot } from '../../core/path-resolver.js';

interface ListOptions {
  type: 'agents' | 'abilities' | 'providers';
}

export const listCommand: CommandModule<Record<string, unknown>, ListOptions> = {
  command: 'list <type>',
  describe: 'List available agents, abilities, or providers',

  builder: (yargs) => {
    return yargs
      .positional('type', {
        describe: 'What to list',
        type: 'string',
        choices: ['agents', 'abilities', 'providers'] as const,
        demandOption: true
      }) as any;
  },

  handler: async (argv) => {
    try {
      const projectDir = await detectProjectRoot();
      // v5.2: agentWorkspace path kept for PathResolver compatibility (directory not created)
      const pathResolver = new PathResolver({
        projectDir,
        workingDir: process.cwd(),
        agentWorkspace: join(projectDir, '.automatosx', 'workspaces')
      });

      switch (argv.type) {
        case 'agents':
          await listAgents(pathResolver);
          break;
        case 'abilities':
          await listAbilities(pathResolver);
          break;
        case 'providers':
          await listProviders();
          break;
      }

    } catch (error) {
      console.log(chalk.red.bold('\n❌ Failed to list ' + argv.type + '\n'));
      console.log(chalk.red((error as Error).message));
      logger.error('List command failed', { type: argv.type, error: (error as Error).message });
      process.exit(1);
    }
  }
};

/**
 * List available agents
 */
async function listAgents(pathResolver: PathResolver): Promise<void> {
  const agentsDir = pathResolver.getAgentsDirectory();
  const { existsSync } = await import('fs');
  const projectDir = await detectProjectRoot();
  const examplesDir = join(projectDir, 'examples', 'agents');

  try {
    // Collect agent files from both directories
    const agentFiles: Array<{ file: string; path: string; source: string }> = [];

    // Load from .automatosx/agents/
    if (existsSync(agentsDir)) {
      const files = await readdir(agentsDir);
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          agentFiles.push({
            file,
            path: join(agentsDir, file),
            source: '.automatosx'
          });
        }
      }
    }

    // Load from examples/agents/
    if (existsSync(examplesDir)) {
      const files = await readdir(examplesDir);
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          // Skip if already loaded from .automatosx (avoid duplicates)
          const alreadyLoaded = agentFiles.some(a => a.file === file);
          if (!alreadyLoaded) {
            agentFiles.push({
              file,
              path: join(examplesDir, file),
              source: 'examples'
            });
          }
        }
      }
    }

    if (agentFiles.length === 0) {
      console.log(chalk.yellow('\n⚠️  No agents found\n'));
      console.log(chalk.gray('Create agents in: ' + agentsDir));
      console.log(chalk.gray('Or run: automatosx init\n'));
      return;
    }

    console.log(chalk.blue.bold('\n🤖 Available Agents:\n'));

    // Load and display each agent's info
    const { load } = await import('js-yaml');
    const { readFile } = await import('fs/promises');

    // Sort by name
    agentFiles.sort((a, b) => a.file.localeCompare(b.file));

    for (const { file, path: agentPath, source } of agentFiles) {
      try {
        const content = await readFile(agentPath, 'utf-8');
        const agent = load(content) as any;

        const name = agent.displayName || agent.name || file.replace(/\.(yaml|yml)$/, '');
        const description = agent.description || 'No description';

        console.log(chalk.cyan(`  • ${name}`) + chalk.gray(` (${source})`));
        console.log(chalk.gray(`    ${description}`));

        if (agent.abilities && agent.abilities.length > 0) {
          console.log(chalk.gray(`    Abilities: ${agent.abilities.join(', ')}`));
        }
        console.log();
      } catch (error) {
        console.log(chalk.yellow(`  • ${file} (error loading)`) + chalk.gray(` (${source})`));
        console.log();
      }
    }

    console.log(chalk.gray(`Total: ${agentFiles.length} agent(s)\n`));

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.yellow('\n⚠️  Agents directory not found\n'));
      console.log(chalk.gray('Run: automatosx init\n'));
    } else {
      throw error;
    }
  }
}

/**
 * List available abilities
 */
async function listAbilities(pathResolver: PathResolver): Promise<void> {
  const abilitiesDir = pathResolver.getAbilitiesDirectory();

  try {
    const files = await readdir(abilitiesDir);
    const abilityFiles = files.filter(f => f.endsWith('.md'));

    if (abilityFiles.length === 0) {
      console.log(chalk.yellow('\n⚠️  No abilities found\n'));
      console.log(chalk.gray('Create abilities in: ' + abilitiesDir));
      console.log(chalk.gray('Or run: automatosx init\n'));
      return;
    }

    console.log(chalk.blue.bold('\n⚡ Available Abilities:\n'));

    const { readFile } = await import('fs/promises');

    for (const file of abilityFiles.sort()) {
      const abilityPath = join(abilitiesDir, file);
      try {
        const content = await readFile(abilityPath, 'utf-8');

        // Extract title and description from markdown
        const lines = content.split('\n');
        const titleLine = lines.find(l => l.startsWith('# '));
        const descLine = lines.find(l => l.startsWith('## Description'));
        const descIndex = lines.indexOf(descLine || '');

        const name = titleLine?.replace('# ', '') || file.replace('.md', '');
        const description = descIndex >= 0 ? lines[descIndex + 1]?.trim() || 'No description' : 'No description';

        console.log(chalk.cyan(`  • ${name}`));
        console.log(chalk.gray(`    ${description}`));
        console.log();
      } catch (error) {
        console.log(chalk.yellow(`  • ${file} (error loading)`));
        console.log();
      }
    }

    console.log(chalk.gray(`Total: ${abilityFiles.length} ability(ies)\n`));

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.yellow('\n⚠️  Abilities directory not found\n'));
      console.log(chalk.gray('Run: automatosx init\n'));
    } else {
      throw error;
    }
  }
}

/**
 * List available providers
 */
async function listProviders(): Promise<void> {
  console.log(chalk.blue.bold('\n🔌 Available Providers:\n'));

  const providers = [
    {
      name: 'claude',
      description: 'Anthropic Claude (via CLI)',
      status: 'Available',
      capabilities: ['text-generation', 'conversation']
    },
    {
      name: 'gemini',
      description: 'Google Gemini (via CLI)',
      status: 'Available',
      capabilities: ['text-generation', 'conversation']
    },
    {
      name: 'openai-embed',
      description: 'OpenAI Embeddings (via CLI)',
      status: 'Available',
      capabilities: ['embeddings']
    }
  ];

  for (const provider of providers) {
    console.log(chalk.cyan(`  • ${provider.name}`));
    console.log(chalk.gray(`    ${provider.description}`));
    console.log(chalk.gray(`    Status: ${provider.status}`));
    console.log(chalk.gray(`    Capabilities: ${provider.capabilities.join(', ')}`));
    console.log();
  }

  console.log(chalk.gray(`Total: ${providers.length} provider(s)\n`));
}
