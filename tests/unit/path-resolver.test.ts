/**
 * PathResolver Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resolve, join } from 'path';
import { PathResolver, detectProjectRoot } from '../../src/core/path-resolver.js';
import { PathError } from '../../src/types/path.js';

describe('PathResolver', () => {
  let resolver: PathResolver;
  const projectDir = '/path/to/project';
  const workingDir = '/path/to/project/src';
  const agentWorkspace = '/path/to/project/.automatosx/workspaces/test';

  beforeEach(() => {
    resolver = new PathResolver({
      projectDir,
      workingDir,
      agentWorkspace
    });
  });

  describe('resolveUserPath', () => {
    it('should resolve relative paths from working directory', () => {
      const result = resolver.resolveUserPath('./file.ts');
      expect(result).toBe(resolve(workingDir, './file.ts'));
    });

    it('should resolve paths with parent directory references', () => {
      const result = resolver.resolveUserPath('../package.json');
      expect(result).toBe(resolve(workingDir, '../package.json'));
    });

    it('should accept absolute paths within project', () => {
      const absolutePath = join(projectDir, 'src/file.ts');
      const result = resolver.resolveUserPath(absolutePath);
      expect(result).toBe(absolutePath);
    });

    it('should reject absolute paths outside project', () => {
      expect(() => {
        resolver.resolveUserPath('/etc/passwd');
      }).toThrow(PathError);
    });

    it('should reject path traversal attempts', () => {
      const workingInSubdir = new PathResolver({
        projectDir,
        workingDir: join(projectDir, 'src/components'),
        agentWorkspace
      });

      expect(() => {
        workingInSubdir.resolveUserPath('../../../etc/passwd');
      }).toThrow(PathError);
    });

    it('should reject Windows paths on non-Windows platforms', () => {
      // Only run this test on non-Windows platforms
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      expect(() => {
        resolver.resolveUserPath('C:\\Windows\\System32');
      }).toThrow(PathError);

      expect(() => {
        resolver.resolveUserPath('D:\\Program Files\\test');
      }).toThrow(PathError);

      expect(() => {
        resolver.resolveUserPath('E:/some/path');
      }).toThrow(PathError);
    });
  });

  describe('resolveProjectPath', () => {
    it('should resolve paths relative to project root', () => {
      const result = resolver.resolveProjectPath('src/index.ts');
      expect(result).toBe(join(projectDir, 'src/index.ts'));
    });

    it('should handle nested paths', () => {
      const result = resolver.resolveProjectPath('src/core/router.ts');
      expect(result).toBe(join(projectDir, 'src/core/router.ts'));
    });
  });

  describe('resolveWorkingPath', () => {
    it('should resolve paths relative to working directory', () => {
      const result = resolver.resolveWorkingPath('file.ts');
      expect(result).toBe(join(workingDir, 'file.ts'));
    });
  });

  describe('resolveWorkspacePath', () => {
    it('should resolve paths within agent workspace', () => {
      const result = resolver.resolveWorkspacePath('output.json');
      expect(result).toBe(join(agentWorkspace, 'output.json'));
    });

    it('should handle nested workspace paths', () => {
      const result = resolver.resolveWorkspacePath('analysis/report.md');
      expect(result).toBe(join(agentWorkspace, 'analysis/report.md'));
    });

    it('should not validate workspace paths against project boundaries', () => {
      // Workspace paths can be anywhere
      const result = resolver.resolveWorkspacePath('../other-agent/file.txt');
      expect(result).toBeDefined();
    });
  });

  describe('validatePath', () => {
    it('should return true for paths within base directory', () => {
      const path = join(projectDir, 'src/file.ts');
      expect(resolver.validatePath(path, projectDir)).toBe(true);
    });

    it('should return false for paths outside base directory', () => {
      const path = '/etc/passwd';
      expect(resolver.validatePath(path, projectDir)).toBe(false);
    });

    it('should return true for exact base directory match', () => {
      expect(resolver.validatePath(projectDir, projectDir)).toBe(true);
    });
  });

  describe('isPathAllowed', () => {
    it('should allow paths in user project', () => {
      const path = join(projectDir, 'src/file.ts');
      expect(resolver.isPathAllowed(path)).toBe(true);
    });

    it('should allow paths in agent workspace', () => {
      const path = join(agentWorkspace, 'output.json');
      expect(resolver.isPathAllowed(path)).toBe(true);
    });

    it('should reject paths outside boundaries', () => {
      expect(resolver.isPathAllowed('/etc/passwd')).toBe(false);
    });

    it('should reject system directories', () => {
      // Platform-specific
      if (process.platform === 'win32') {
        expect(resolver.isPathAllowed('C:\\Windows\\System32')).toBe(false);
      } else {
        expect(resolver.isPathAllowed('/etc')).toBe(false);
        expect(resolver.isPathAllowed('/proc')).toBe(false);
      }
    });
  });

  describe('checkBoundaries', () => {
    it('should identify agent workspace paths', () => {
      const path = join(agentWorkspace, 'file.txt');
      expect(resolver.checkBoundaries(path)).toBe('agent_workspace');
    });

    it('should identify user project paths', () => {
      const path = join(projectDir, 'src/file.ts');
      expect(resolver.checkBoundaries(path)).toBe('user_project');
    });

    it('should identify system restricted paths', () => {
      if (process.platform !== 'win32') {
        expect(resolver.checkBoundaries('/etc/passwd')).toBe('system_restricted');
      }
    });

    it('should identify outside boundaries', () => {
      expect(resolver.checkBoundaries('/random/path')).toBe('outside_boundaries');
    });
  });

  describe('getRelativeToProject', () => {
    it('should return relative path from project root', () => {
      const path = join(projectDir, 'src/file.ts');
      expect(resolver.getRelativeToProject(path)).toBe('src/file.ts');
    });

    it('should handle paths in subdirectories', () => {
      const path = join(projectDir, 'src/core/router.ts');
      expect(resolver.getRelativeToProject(path)).toBe('src/core/router.ts');
    });
  });

  describe('getRelativeToWorking', () => {
    it('should return relative path from working directory', () => {
      const path = join(workingDir, 'file.ts');
      expect(resolver.getRelativeToWorking(path)).toBe('file.ts');
    });

    it('should handle parent directory', () => {
      const path = join(projectDir, 'package.json');
      expect(resolver.getRelativeToWorking(path)).toBe('../package.json');
    });
  });
});

describe('detectProjectRoot', () => {
  it('should detect project root from package.json', async () => {
    // This test will pass if run from automatosx directory with package.json
    const root = await detectProjectRoot(process.cwd());
    expect(root).toBeDefined();
    expect(root).toBeTruthy();
  });

  it('should fallback to start directory if no markers found', async () => {
    const tmpDir = '/tmp/no-project-markers';
    const root = await detectProjectRoot(tmpDir);
    expect(root).toBe(tmpDir);
  });
});
