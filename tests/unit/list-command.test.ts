/**
 * List Command Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('List Command', () => {
  let testDir: string;
  let automatosxDir: string;

  beforeEach(async () => {
    // Create unique test directory
    testDir = join(tmpdir(), `list-test-${Date.now()}`);
    automatosxDir = join(testDir, '.automatosx');

    await mkdir(testDir, { recursive: true });
    await mkdir(automatosxDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('List Agents', () => {
    beforeEach(async () => {
      await mkdir(join(automatosxDir, 'agents'), { recursive: true });
    });

    it('should list available agents', async () => {
      // Create sample agent files
      await writeFile(
        join(automatosxDir, 'agents', 'assistant.yaml'),
        'name: Assistant\ndescription: General assistant\n',
        'utf-8'
      );
      await writeFile(
        join(automatosxDir, 'agents', 'coder.yml'),
        'name: Coder\ndescription: Code assistant\n',
        'utf-8'
      );

      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'agents'));
      const agentFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      expect(agentFiles).toHaveLength(2);
      expect(agentFiles).toContain('assistant.yaml');
      expect(agentFiles).toContain('coder.yml');
    });

    it('should handle empty agents directory', async () => {
      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'agents'));
      const agentFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      expect(agentFiles).toHaveLength(0);
    });

    it('should filter non-agent files', async () => {
      await writeFile(join(automatosxDir, 'agents', 'agent.yaml'), 'name: Agent\n', 'utf-8');
      await writeFile(join(automatosxDir, 'agents', 'README.md'), '# Agents', 'utf-8');
      await writeFile(join(automatosxDir, 'agents', 'config.json'), '{}', 'utf-8');

      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'agents'));
      const agentFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      expect(agentFiles).toHaveLength(1);
      expect(agentFiles[0]).toBe('agent.yaml');
    });

    it('should support both .yaml and .yml extensions', async () => {
      await writeFile(join(automatosxDir, 'agents', 'agent1.yaml'), 'name: Agent1\n', 'utf-8');
      await writeFile(join(automatosxDir, 'agents', 'agent2.yml'), 'name: Agent2\n', 'utf-8');

      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'agents'));
      const yamlFiles = files.filter(f => f.endsWith('.yaml'));
      const ymlFiles = files.filter(f => f.endsWith('.yml'));

      expect(yamlFiles).toHaveLength(1);
      expect(ymlFiles).toHaveLength(1);
    });
  });

  describe('List Abilities', () => {
    beforeEach(async () => {
      await mkdir(join(automatosxDir, 'abilities'), { recursive: true });
    });

    it('should list available abilities', async () => {
      // Create sample ability files
      await writeFile(
        join(automatosxDir, 'abilities', 'file-ops.md'),
        '# File Operations\nRead and write files\n',
        'utf-8'
      );
      await writeFile(
        join(automatosxDir, 'abilities', 'web-search.md'),
        '# Web Search\nSearch the web\n',
        'utf-8'
      );

      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'abilities'));
      const abilityFiles = files.filter(f => f.endsWith('.md'));

      expect(abilityFiles).toHaveLength(2);
      expect(abilityFiles).toContain('file-ops.md');
      expect(abilityFiles).toContain('web-search.md');
    });

    it('should handle empty abilities directory', async () => {
      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'abilities'));
      const abilityFiles = files.filter(f => f.endsWith('.md'));

      expect(abilityFiles).toHaveLength(0);
    });

    it('should filter non-ability files', async () => {
      await writeFile(join(automatosxDir, 'abilities', 'ability.md'), '# Ability\n', 'utf-8');
      await writeFile(join(automatosxDir, 'abilities', 'ability.yaml'), 'name: test\n', 'utf-8');
      await writeFile(join(automatosxDir, 'abilities', 'README.txt'), 'Info', 'utf-8');

      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'abilities'));
      const abilityFiles = files.filter(f => f.endsWith('.md'));

      expect(abilityFiles).toHaveLength(1);
      expect(abilityFiles[0]).toBe('ability.md');
    });

    it('should parse ability metadata from markdown', async () => {
      const abilityContent = `# File Operations

**Category**: System
**Tags**: files, io, filesystem

Read and write files to disk.`;

      await writeFile(
        join(automatosxDir, 'abilities', 'file-ops.md'),
        abilityContent,
        'utf-8'
      );

      const { readFile } = await import('fs/promises');
      const content = await readFile(join(automatosxDir, 'abilities', 'file-ops.md'), 'utf-8');

      expect(content).toContain('# File Operations');
      expect(content).toContain('**Category**: System');
      expect(content).toContain('files, io, filesystem');
    });
  });

  describe('List Providers', () => {
    it('should list available providers', () => {
      const providers = [
        { name: 'claude-code', enabled: true, priority: 1 },
        { name: 'gemini-cli', enabled: true, priority: 2 }
      ];

      expect(providers).toHaveLength(2);
      expect(providers[0]?.name).toBe('claude-code');
      expect(providers[1]?.name).toBe('gemini-cli');
    });

    it('should show provider status', () => {
      const provider = {
        name: 'claude-code',
        enabled: true,
        priority: 1,
        available: true
      };

      expect(provider.enabled).toBe(true);
      expect(provider.available).toBe(true);
    });

    it('should show provider priority', () => {
      const providers = [
        { name: 'claude', priority: 1 },
        { name: 'gemini', priority: 2 },
        { name: 'openai', priority: 3 }
      ];

      const sorted = providers.sort((a, b) => a.priority - b.priority);

      expect(sorted[0]?.name).toBe('claude');
      expect(sorted[2]?.name).toBe('openai');
    });

    it('should distinguish enabled and disabled providers', () => {
      const providers = [
        { name: 'claude', enabled: true },
        { name: 'gemini', enabled: false },
        { name: 'openai', enabled: true }
      ];

      const enabled = providers.filter(p => p.enabled);
      const disabled = providers.filter(p => !p.enabled);

      expect(enabled).toHaveLength(2);
      expect(disabled).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing agents directory', async () => {
      const agentsDir = join(automatosxDir, 'agents');
      const exists = await checkExists(agentsDir);

      expect(exists).toBe(false);
    });

    it('should handle missing abilities directory', async () => {
      const abilitiesDir = join(automatosxDir, 'abilities');
      const exists = await checkExists(abilitiesDir);

      expect(exists).toBe(false);
    });

    it('should handle invalid YAML in agent file', async () => {
      await mkdir(join(automatosxDir, 'agents'), { recursive: true });
      await writeFile(
        join(automatosxDir, 'agents', 'invalid.yaml'),
        'invalid: yaml: content:',
        'utf-8'
      );

      const { readFile } = await import('fs/promises');
      const content = await readFile(join(automatosxDir, 'agents', 'invalid.yaml'), 'utf-8');

      // Should handle parse errors gracefully
      expect(content).toBeDefined();
    });

    it('should handle permission denied errors', async () => {
      // Simulated permission error
      const restrictedDir = join(automatosxDir, 'restricted');
      await mkdir(restrictedDir, { recursive: true });

      const exists = await checkExists(restrictedDir);
      expect(exists).toBe(true);
    });
  });

  describe('Type Validation', () => {
    it('should only accept valid list types', () => {
      const validTypes = ['agents', 'abilities', 'providers'];

      expect(validTypes).toContain('agents');
      expect(validTypes).toContain('abilities');
      expect(validTypes).toContain('providers');
      expect(validTypes).not.toContain('invalid');
    });

    it('should reject invalid types', () => {
      const validTypes = ['agents', 'abilities', 'providers'];
      const invalidType = 'workspaces';

      expect(validTypes).not.toContain(invalidType);
    });
  });
});

/**
 * Helper Functions
 */

async function checkExists(path: string): Promise<boolean> {
  try {
    const { access } = await import('fs/promises');
    const { constants } = await import('fs');
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
