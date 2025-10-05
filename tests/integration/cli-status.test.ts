import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'dist', 'index.js');

describe('CLI: status command', () => {
  it('should display system status', async () => {
    const result = await runCLI(['status']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('AutomatosX Status');
    expect(result.stdout).toContain('System:');
    expect(result.stdout).toContain('Version:');
  }, 10000);

  it('should show verbose output with --verbose', async () => {
    const result = await runCLI(['status', '--verbose']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Process Uptime');
    expect(result.stdout).toContain('Performance:');
  }, 10000);

  it('should output JSON with --json', async () => {
    const result = await runCLI(['status', '--json']);

    expect(result.exitCode).toBe(0);

    // Should be valid JSON
    const json = JSON.parse(result.stdout);
    expect(json).toHaveProperty('system');
    expect(json).toHaveProperty('providers');
    expect(json).toHaveProperty('router');
  }, 10000);
});

function runCLI(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code || 0,
        stdout,
        stderr
      });
    });
  });
}
