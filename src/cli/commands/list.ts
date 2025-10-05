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

  try {
    const files = await readdir(agentsDir);
    const agentFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

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

    for (const file of agentFiles.sort()) {
      const agentPath = join(agentsDir, file);
      try {
        const content = await readFile(agentPath, 'utf-8');
        const agent = load(content) as any;

        const name = agent.name || file.replace(/\.(yaml|yml)$/, '');
        const description = agent.description || 'No description';

        console.log(chalk.cyan(`  • ${name}`));
        console.log(chalk.gray(`    ${description}`));

        if (agent.abilities && agent.abilities.length > 0) {
          console.log(chalk.gray(`    Abilities: ${agent.abilities.join(', ')}`));
        }
        console.log();
      } catch (error) {
        console.log(chalk.yellow(`  • ${file} (error loading)`));
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
