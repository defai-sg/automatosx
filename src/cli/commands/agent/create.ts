/**
 * Agent Create Command - Create agent from template
 * @since v5.0.0
 */

import type { CommandModule } from 'yargs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { load as loadYaml } from 'js-yaml';
import chalk from 'chalk';
import * as readline from 'readline';
import { TemplateEngine, type TemplateVariables } from '../../../agents/template-engine.js';

interface CreateOptions {
  agent: string;
  template?: string;
  displayName?: string;
  role?: string;
  description?: string;
  team?: string;
  interactive?: boolean;
}

const AVAILABLE_TEMPLATES = [
  'basic-agent',
  'developer',
  'analyst',
  'designer',
  'qa-specialist'
];

const TEAM_CHOICES = ['core', 'engineering', 'business', 'design'];

export const createCommand: CommandModule<{}, CreateOptions> = {
  command: 'create <agent>',
  describe: 'Create a new agent from template',

  builder: (yargs) => {
    return yargs
      .positional('agent', {
        describe: 'Agent name',
        type: 'string',
        demandOption: true
      })
      .option('template', {
        describe: 'Template to use',
        type: 'string',
        alias: 't',
        choices: AVAILABLE_TEMPLATES
      })
      .option('display-name', {
        describe: 'Agent display name',
        type: 'string',
        alias: 'd'
      })
      .option('role', {
        describe: 'Agent role',
        type: 'string',
        alias: 'r'
      })
      .option('description', {
        describe: 'Agent description',
        type: 'string'
      })
      .option('team', {
        describe: 'Team name',
        type: 'string',
        choices: TEAM_CHOICES
      })
      .option('interactive', {
        describe: 'Interactive mode (prompt for all values)',
        type: 'boolean',
        alias: 'i',
        default: false
      });
  },

  handler: async (argv) => {
    try {
      const projectDir = process.cwd();
      const agentsDir = join(projectDir, '.automatosx', 'agents');
      const agentFile = join(agentsDir, `${argv.agent}.yaml`);

      // Check if agent already exists
      if (existsSync(agentFile)) {
        console.log(chalk.red.bold(`\n✗ Agent already exists: ${argv.agent}\n`));
        console.log(chalk.gray('Use a different name or remove the existing agent first.\n'));
        process.exit(1);
      }

      // Ensure agents directory exists
      await mkdir(agentsDir, { recursive: true });

      // Get template name
      let templateName = argv.template;
      if (!templateName) {
        templateName = await askTemplate();
      }

      // Load template
      const templatePath = await findTemplate(templateName);
      const templateContent = await readFile(templatePath, 'utf-8');
      const templateYaml = loadYaml(templateContent) as any;

      // Collect variables
      const variables: TemplateVariables = {
        AGENT_NAME: argv.agent,
        DISPLAY_NAME: argv.displayName || '',
        ROLE: argv.role || '',
        DESCRIPTION: argv.description || '',
        TEAM: argv.team || ''
      };

      // Interactive mode - ask for missing values
      if (argv.interactive || !variables.DISPLAY_NAME) {
        variables.DISPLAY_NAME = await ask('Display Name', variables.DISPLAY_NAME || argv.agent);
      }

      if (argv.interactive || (!variables.ROLE && templateYaml.role?.includes('{{'))) {
        variables.ROLE = await ask('Role', variables.ROLE || extractDefault(templateYaml.role) || 'AI Assistant');
      }

      if (argv.interactive || (!variables.DESCRIPTION && templateYaml.description?.includes('{{'))) {
        variables.DESCRIPTION = await ask(
          'Description',
          variables.DESCRIPTION || extractDefault(templateYaml.description) || 'A helpful AI assistant'
        );
      }

      if (argv.interactive || (!variables.TEAM && templateYaml.team?.includes('{{'))) {
        variables.TEAM = await askTeam(variables.TEAM || extractDefault(templateYaml.team) || 'core');
      }

      // Render template
      const engine = new TemplateEngine();
      const rendered = engine.render(templateContent, variables);

      // Write agent file
      await writeFile(agentFile, rendered, 'utf-8');

      console.log(chalk.green.bold(`\n✓ Agent '${argv.agent}' created successfully\n`));
      console.log(chalk.white(`Display Name: ${chalk.cyan(variables.DISPLAY_NAME)}`));
      console.log(chalk.white(`Team:         ${chalk.cyan(variables.TEAM || 'core')}`));
      console.log(chalk.white(`Template:     ${chalk.gray(templateName)}`));
      console.log(chalk.white(`File:         ${chalk.gray(agentFile)}`));
      console.log();
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  • Edit the agent: ax agent edit ' + argv.agent));
      console.log(chalk.gray('  • View details:   ax agent show ' + argv.agent));
      console.log(chalk.gray('  • Run the agent:  ax run ' + argv.agent + ' "your task"'));
      console.log();

    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error creating agent\n'));
      console.error(chalk.red((error as Error).message));
      if ((error as Error).stack) {
        console.error(chalk.gray((error as Error).stack));
      }
      process.exit(1);
    }
  }
};

/**
 * Find template file
 */
async function findTemplate(name: string): Promise<string> {
  // Check project templates first
  const projectTemplate = join(process.cwd(), '.automatosx', 'templates', `${name}.yaml`);
  if (existsSync(projectTemplate)) {
    return projectTemplate;
  }

  // Check default templates
  const defaultTemplate = join(__dirname, '../../../../examples/templates', `${name}.yaml`);
  if (existsSync(defaultTemplate)) {
    return defaultTemplate;
  }

  throw new Error(`Template not found: ${name}\nRun "ax agent templates" to see available templates.`);
}

/**
 * Ask for template selection
 */
async function askTemplate(): Promise<string> {
  console.log(chalk.blue.bold('\n📋 Available Templates:\n'));
  console.log(chalk.white('  1. basic-agent    - Basic agent (core team)'));
  console.log(chalk.white('  2. developer      - Software developer (engineering)'));
  console.log(chalk.white('  3. analyst        - Business analyst (business)'));
  console.log(chalk.white('  4. designer       - UI/UX designer (design)'));
  console.log(chalk.white('  5. qa-specialist  - QA specialist (core)'));
  console.log();

  const answer = await ask('Select template (1-5)', '1');
  const index = parseInt(answer) - 1;

  if (index >= 0 && index < AVAILABLE_TEMPLATES.length) {
    return AVAILABLE_TEMPLATES[index] ?? 'basic-agent';
  }

  return 'basic-agent';
}

/**
 * Ask for team selection
 */
async function askTeam(defaultValue: string): Promise<string> {
  console.log(chalk.blue.bold('\n👥 Available Teams:\n'));
  console.log(chalk.white('  1. core        - Quality assurance, core functions'));
  console.log(chalk.white('  2. engineering - Software development'));
  console.log(chalk.white('  3. business    - Business analysis, product'));
  console.log(chalk.white('  4. design      - UI/UX design'));
  console.log();

  const answer = await ask('Select team (1-4)', getTeamIndex(defaultValue).toString());
  const index = parseInt(answer) - 1;

  if (index >= 0 && index < TEAM_CHOICES.length) {
    return TEAM_CHOICES[index] ?? defaultValue ?? 'core';
  }

  return defaultValue || 'core';
}

/**
 * Get team index (1-based)
 */
function getTeamIndex(team: string): number {
  const index = TEAM_CHOICES.indexOf(team);
  return index >= 0 ? index + 1 : 1;
}

/**
 * Extract default value from template variable
 */
function extractDefault(value: string): string | undefined {
  if (!value || !value.includes('default:')) return undefined;

  const match = value.match(/default:\s*([^}]+)/);
  return match?.[1]?.trim();
}

/**
 * Ask user for input
 */
function ask(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = defaultValue
    ? `${question} [${chalk.gray(defaultValue)}]: `
    : `${question}: `;

  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}
