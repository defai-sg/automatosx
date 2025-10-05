/**
 * Interactive Prompts - Standardized user interactions
 *
 * Provides consistent confirmation, input, and selection prompts
 */

import inquirer from 'inquirer';

export interface ConfirmOptions {
  /**
   * Prompt message
   */
  message: string;

  /**
   * Default value (defaults to false for safety)
   */
  default?: boolean;

  /**
   * Warning message to show before confirmation
   */
  warning?: string;
}

export interface InputOptions {
  /**
   * Prompt message
   */
  message: string;

  /**
   * Default value
   */
  default?: string;

  /**
   * Validation function
   */
  validate?: (value: string) => boolean | string;

  /**
   * Input type (default: 'input')
   */
  type?: 'input' | 'password';
}

export interface SelectOptions<T = string> {
  /**
   * Prompt message
   */
  message: string;

  /**
   * Choices
   */
  choices: Array<{ name: string; value: T }>;

  /**
   * Default value
   */
  default?: T;
}

/**
 * Confirm action with yes/no prompt
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
  const { message, default: defaultValue = false, warning } = options;

  if (warning) {
    console.log(`\n⚠️  ${warning}\n`);
  }

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }
  ]);

  return confirmed;
}

/**
 * Get text input from user
 */
export async function input(options: InputOptions): Promise<string> {
  const { message, default: defaultValue, validate, type = 'input' } = options;

  const { value } = await inquirer.prompt<{ value: string }>([
    {
      type,
      name: 'value',
      message,
      default: defaultValue,
      validate: validate || ((v: string) => v.trim() !== '' || 'Value cannot be empty')
    }
  ]);

  return value;
}

/**
 * Select from list of options
 */
export async function select<T = string>(options: SelectOptions<T>): Promise<T> {
  const { message, choices, default: defaultValue } = options;

  const { selected } = await inquirer.prompt<{ selected: T }>([
    {
      type: 'list',
      name: 'selected',
      message,
      choices,
      default: defaultValue
    }
  ]);

  return selected;
}

/**
 * Confirm destructive action (default: false)
 */
export async function confirmDestructive(
  message: string,
  warning?: string
): Promise<boolean> {
  return confirm({
    message,
    default: false,
    warning: warning || '⚠️  This action cannot be undone'
  });
}

/**
 * Confirm with custom default
 */
export async function confirmWithDefault(
  message: string,
  defaultValue: boolean
): Promise<boolean> {
  return confirm({
    message,
    default: defaultValue
  });
}

/**
 * Multi-select from list of options
 */
export async function multiSelect<T = string>(
  options: SelectOptions<T>
): Promise<T[]> {
  const { message, choices, default: defaultValue } = options;

  const { selected } = await inquirer.prompt<{ selected: T[] }>([
    {
      type: 'checkbox',
      name: 'selected',
      message,
      choices,
      default: defaultValue ? [defaultValue] : []
    }
  ]);

  return selected;
}
