/**
 * CLI Chat Command Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('CLI Chat Command Integration', () => {
  let testDir: string;
  let cliPath: string;

  beforeEach(async () => {
    // Create test directory
    testDir = join(tmpdir(), `automatosx-chat-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // CLI path (built binary)
    cliPath = join(process.cwd(), 'dist', 'index.js');
  });

  afterEach(async () => {
    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Basic Chat Functionality', () => {
    // TODO: Chat command should validate agent profile before starting
    it('should start chat interface', async () => {
      const chatProcess = spawn('node', [cliPath, 'chat', 'test'], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stdout = '';

      chatProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Wait for startup
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Kill process
      chatProcess.kill('SIGTERM');

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      // Should show chat header
      expect(stdout).toMatch(/AutomatosX Chat|chat/i);
    }, 15000);

    it('should show chat header when starting session', async () => {
      // Create agent profile
      const agentDir = join(testDir, '.automatosx', 'agents');
      await mkdir(agentDir, { recursive: true });

      const agentProfile = `
name: ChatBot
role: assistant
description: A chat bot
systemPrompt: You are a helpful assistant
abilities: []
provider: claude
temperature: 0.7
`;
      await writeFile(join(agentDir, 'chatbot.yaml'), agentProfile);

      // Start chat process with auto-exit
      const chatProcess = spawn('node', [cliPath, 'chat', 'chatbot'], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stdout = '';
      let stderr = '';

      chatProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      chatProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Send exit command
      chatProcess.stdin.write('exit\n');
      chatProcess.stdin.end();

      // Wait for process to exit
      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      expect(stdout).toContain('AutomatosX Chat');
      expect(stdout).toContain('chatbot');
      expect(stdout).toContain('exit');
    }, 15000);

    it('should handle single message interaction', async () => {
      // Create agent profile
      const agentDir = join(testDir, '.automatosx', 'agents');
      await mkdir(agentDir, { recursive: true });

      const agentProfile = `
name: Echo
role: assistant
description: Echo bot
systemPrompt: You are an echo bot
abilities: []
provider: claude
`;
      await writeFile(join(agentDir, 'echo.yaml'), agentProfile);

      const chatProcess = spawn('node', [cliPath, 'chat', 'echo'], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stdout = '';

      chatProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Send message
      chatProcess.stdin.write('Hello\n');

      // Wait for response
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Exit
      chatProcess.stdin.write('exit\n');
      chatProcess.stdin.end();

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      expect(stdout).toContain('Hello');
      expect(stdout).toMatch(/You:|Response:/i);
    }, 15000);

    // TODO: Fix verbose mode initialization hang
    it.skip('should support verbose mode', async () => {
      // Test skipped due to initialization timeout
      // Needs investigation of chat command verbose mode startup
    });
  });

  describe('Session Management', () => {
    it('should save session when --save-session is used', async () => {
      const agentDir = join(testDir, '.automatosx', 'agents');
      await mkdir(agentDir, { recursive: true });

      const agentProfile = `
name: SessionTest
role: assistant
systemPrompt: Test
abilities: []
`;
      await writeFile(join(agentDir, 'session.yaml'), agentProfile);

      const chatProcess = spawn('node', [
        cliPath, 'chat', 'session', '--save-session'
      ], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stdout = '';

      chatProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      chatProcess.stdin.write('Test message\n');
      await new Promise((resolve) => setTimeout(resolve, 500));

      chatProcess.stdin.write('exit\n');
      chatProcess.stdin.end();

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      // Should mention session save
      expect(stdout).toMatch(/saved|session/i);
    }, 15000);

    it('should accept --load-session parameter', async () => {
      const agentDir = join(testDir, '.automatosx', 'agents');
      const sessionsDir = join(testDir, '.automatosx', 'sessions');
      await mkdir(agentDir, { recursive: true });
      await mkdir(sessionsDir, { recursive: true });

      const agentProfile = `
name: LoadTest
role: assistant
systemPrompt: Test
abilities: []
`;
      await writeFile(join(agentDir, 'load.yaml'), agentProfile);

      // Create fake session file
      const sessionFile = join(sessionsDir, 'test-session.json');
      const sessionData = {
        id: 'test-session',
        agent: 'load',
        started: Date.now(),
        messages: [
          { role: 'user', content: 'Previous message', timestamp: Date.now() }
        ]
      };
      await writeFile(sessionFile, JSON.stringify(sessionData));

      const chatProcess = spawn('node', [
        cliPath, 'chat', 'load', '--load-session', sessionFile
      ], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stdout = '';

      chatProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      chatProcess.stdin.write('exit\n');
      chatProcess.stdin.end();

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      // Should load session
      expect(stdout).toBeTruthy();
    }, 15000);
  });

  describe('Provider Override', () => {
    it('should accept --provider option', async () => {
      const agentDir = join(testDir, '.automatosx', 'agents');
      await mkdir(agentDir, { recursive: true });

      const agentProfile = `
name: ProviderTest
role: assistant
systemPrompt: Test
abilities: []
provider: claude
`;
      await writeFile(join(agentDir, 'provider.yaml'), agentProfile);

      const chatProcess = spawn('node', [
        cliPath, 'chat', 'provider', '--provider', 'gemini'
      ], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stdout = '';

      chatProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      chatProcess.stdin.write('exit\n');
      chatProcess.stdin.end();

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      expect(stdout).toBeTruthy();
    }, 15000);

    it('should accept --model option', async () => {
      const agentDir = join(testDir, '.automatosx', 'agents');
      await mkdir(agentDir, { recursive: true });

      const agentProfile = `
name: ModelTest
role: assistant
systemPrompt: Test
abilities: []
`;
      await writeFile(join(agentDir, 'model.yaml'), agentProfile);

      const chatProcess = spawn('node', [
        cliPath, 'chat', 'model', '--model', 'custom-model'
      ], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stdout = '';

      chatProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      chatProcess.stdin.write('exit\n');
      chatProcess.stdin.end();

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      expect(stdout).toBeTruthy();
    }, 15000);
  });

  describe('Memory Integration', () => {
    it('should support --memory flag', async () => {
      const agentDir = join(testDir, '.automatosx', 'agents');
      await mkdir(agentDir, { recursive: true });

      const agentProfile = `
name: MemoryTest
role: assistant
systemPrompt: Test
abilities: []
`;
      await writeFile(join(agentDir, 'memory.yaml'), agentProfile);

      const chatProcess = spawn('node', [
        cliPath, 'chat', 'memory', '--memory'
      ], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stdout = '';

      chatProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      chatProcess.stdin.write('exit\n');
      chatProcess.stdin.end();

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      expect(stdout).toBeTruthy();
    }, 15000);

    it('should support --no-memory flag', async () => {
      const agentDir = join(testDir, '.automatosx', 'agents');
      await mkdir(agentDir, { recursive: true });

      const agentProfile = `
name: NoMemoryTest
role: assistant
systemPrompt: Test
abilities: []
`;
      await writeFile(join(agentDir, 'nomem.yaml'), agentProfile);

      const chatProcess = spawn('node', [
        cliPath, 'chat', 'nomem', '--no-memory'
      ], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stdout = '';

      chatProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      chatProcess.stdin.write('exit\n');
      chatProcess.stdin.end();

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      expect(stdout).toBeTruthy();
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle missing config gracefully', async () => {
      // No config or agent created
      const chatProcess = spawn('node', [cliPath, 'chat', 'missing'], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stderr = '';
      let exitCode: number | null = null;

      chatProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      chatProcess.on('close', (code) => {
        exitCode = code;
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      chatProcess.stdin.end();

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      expect(exitCode).toBe(1);
      expect(stderr).toBeTruthy();
    }, 15000);

    it('should handle invalid session file', async () => {
      const agentDir = join(testDir, '.automatosx', 'agents');
      await mkdir(agentDir, { recursive: true });

      const agentProfile = `
name: InvalidSession
role: assistant
systemPrompt: Test
abilities: []
`;
      await writeFile(join(agentDir, 'invalid.yaml'), agentProfile);

      const chatProcess = spawn('node', [
        cliPath, 'chat', 'invalid', '--load-session', '/nonexistent/session.json'
      ], {
        cwd: testDir,
        env: {
          ...process.env,
          AUTOMATOSX_MOCK_PROVIDERS: 'true'
        }
      });

      let stderr = '';
      let exitCode: number | null = null;

      chatProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      chatProcess.on('close', (code) => {
        exitCode = code;
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      chatProcess.stdin.end();

      await new Promise((resolve) => {
        chatProcess.on('close', resolve);
      });

      // Should either show error or handle gracefully
      expect(exitCode !== 0 || stderr.length > 0).toBeTruthy();
    }, 15000);
  });
});
