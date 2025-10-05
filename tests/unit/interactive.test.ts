/**
 * Interactive Prompts Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import inquirer from 'inquirer';
import {
  confirm,
  confirmDestructive,
  confirmWithDefault,
  input,
  select,
  multiSelect
} from '../../src/utils/interactive.js';

// Mock inquirer
vi.mock('inquirer');

describe('Interactive Prompts', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('confirm', () => {
    it('should confirm with default false', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

      const result = await confirm({ message: 'Proceed?' });

      expect(result).toBe(true);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Proceed?',
          default: false
        }
      ]);
    });

    it('should confirm with custom default', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: false });

      const result = await confirm({ message: 'Proceed?', default: true });

      expect(result).toBe(false);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Proceed?',
          default: true
        }
      ]);
    });

    it('should show warning before confirmation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

      await confirm({
        message: 'Delete all data?',
        warning: 'This action cannot be undone'
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('\n⚠️  This action cannot be undone\n');
    });
  });

  describe('confirmDestructive', () => {
    it('should use default false and show default warning', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: false });

      const result = await confirmDestructive('Delete everything?');

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith('\n⚠️  ⚠️  This action cannot be undone\n');
    });

    it('should show custom warning', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

      await confirmDestructive('Delete project?', 'All files will be removed');

      expect(consoleLogSpy).toHaveBeenCalledWith('\n⚠️  All files will be removed\n');
    });
  });

  describe('confirmWithDefault', () => {
    it('should use provided default value', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: true });

      await confirmWithDefault('Save changes?', true);

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          default: true
        })
      ]);
    });
  });

  describe('input', () => {
    it('should get text input', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ value: 'user input' });

      const result = await input({ message: 'Enter name:' });

      expect(result).toBe('user input');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'input',
          name: 'value',
          message: 'Enter name:',
          default: undefined,
          validate: expect.any(Function)
        }
      ]);
    });

    it('should use default value', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ value: 'default-name' });

      await input({ message: 'Enter name:', default: 'default-name' });

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          default: 'default-name'
        })
      ]);
    });

    it('should use custom validation', async () => {
      const customValidate = (v: string) => v.length > 3 || 'Too short';
      vi.mocked(inquirer.prompt).mockResolvedValue({ value: 'test' });

      await input({ message: 'Enter name:', validate: customValidate });

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          validate: customValidate
        })
      ]);
    });

    it('should support password type', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ value: 'secret' });

      await input({ message: 'Enter password:', type: 'password' });

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'password'
        })
      ]);
    });

    it('should validate non-empty by default', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ value: 'test' });

      await input({ message: 'Enter value:' });

      const calls = vi.mocked(inquirer.prompt).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const promptArgs = calls[0]?.[0] as any;
      expect(promptArgs).toBeDefined();

      const validateFn = promptArgs[0]?.validate as (v: string) => boolean | string;
      expect(validateFn).toBeDefined();

      expect(validateFn('test')).toBe(true);
      expect(validateFn('  ')).toBe('Value cannot be empty');
    });
  });

  describe('select', () => {
    it('should select from list', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ selected: 'option2' });

      const result = await select({
        message: 'Choose option:',
        choices: [
          { name: 'Option 1', value: 'option1' },
          { name: 'Option 2', value: 'option2' }
        ]
      });

      expect(result).toBe('option2');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'selected',
          message: 'Choose option:',
          choices: [
            { name: 'Option 1', value: 'option1' },
            { name: 'Option 2', value: 'option2' }
          ],
          default: undefined
        }
      ]);
    });

    it('should use default value', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ selected: 'option1' });

      await select({
        message: 'Choose:',
        choices: [
          { name: 'Option 1', value: 'option1' },
          { name: 'Option 2', value: 'option2' }
        ],
        default: 'option1'
      });

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          default: 'option1'
        })
      ]);
    });
  });

  describe('multiSelect', () => {
    it('should select multiple items', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ selected: ['option1', 'option3'] });

      const result = await multiSelect({
        message: 'Choose options:',
        choices: [
          { name: 'Option 1', value: 'option1' },
          { name: 'Option 2', value: 'option2' },
          { name: 'Option 3', value: 'option3' }
        ]
      });

      expect(result).toEqual(['option1', 'option3']);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'checkbox',
          name: 'selected',
          message: 'Choose options:',
          choices: [
            { name: 'Option 1', value: 'option1' },
            { name: 'Option 2', value: 'option2' },
            { name: 'Option 3', value: 'option3' }
          ],
          default: []
        }
      ]);
    });

    it('should use default value', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ selected: ['option2'] });

      await multiSelect({
        message: 'Choose:',
        choices: [
          { name: 'Option 1', value: 'option1' },
          { name: 'Option 2', value: 'option2' }
        ],
        default: 'option2'
      });

      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          default: ['option2']
        })
      ]);
    });
  });
});
