# Contributing to AutomatosX

Thank you for your interest in contributing to AutomatosX! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)

## Code of Conduct

This project follows a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/automatosx.git`
3. Add upstream remote: `git remote add upstream https://github.com/automatosx/automatosx.git`

## Development Setup

### Prerequisites

- Node.js 20.0.0 or later
- npm, pnpm, or yarn

### Installation

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Run in development mode
npm run dev -- <command>
```

## Making Changes

### Creating a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test improvements
- `refactor/` - Code refactoring
- `perf/` - Performance improvements

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write tests for all new features
- Maintain or improve test coverage (current: 67%)
- Place unit tests in `tests/unit/`
- Place integration tests in `tests/integration/`
- Use descriptive test names
- Follow existing test patterns

### Test Requirements

- All tests must pass before submitting PR
- Coverage should not decrease
- Add tests for bug fixes to prevent regression

## Submitting Changes

### Before Submitting

1. **Run tests**: `npm test`
2. **Type check**: `npm run typecheck`
3. **Build**: `npm run build`
4. **Update documentation** if needed
5. **Update CHANGELOG.md** with your changes

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `test` - Test changes
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `chore` - Build/tooling changes

**Examples**:

```
feat(memory): add vector search optimization

Implement caching layer for frequently accessed vectors
to reduce query latency by 40%.

Closes #123
```

```
fix(cli): resolve path resolution bug in Windows

Fix path separator issues when running on Windows.
Add cross-platform path normalization.

Fixes #456
```

### Pull Request Process

1. **Update your branch**:

   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Push to your fork**:

   ```bash
   git push origin your-branch
   ```

3. **Create Pull Request**:
   - Use a clear, descriptive title
   - Reference related issues
   - Describe what changed and why
   - Include screenshots for UI changes
   - List breaking changes if any

4. **PR Template**:

   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Tests pass locally
   - [ ] Added/updated tests
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows project style
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] No breaking changes (or documented)
   ```

5. **Review Process**:
   - Address reviewer feedback
   - Make requested changes
   - Push updates to your branch
   - Re-request review when ready

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Provide type annotations for all public APIs
- Avoid `any` type unless absolutely necessary
- Use meaningful variable and function names
- Keep functions small and focused

### Code Style

```typescript
// Good
export async function loadProfile(
  profilePath: string,
  options: LoadOptions = {}
): Promise<AgentProfile> {
  // Implementation
}

// Bad
export async function load(p: string, o: any) {
  // Implementation
}
```

### Documentation

- Add JSDoc comments for all public APIs
- Include parameter descriptions
- Document return types
- Provide usage examples

```typescript
/**
 * Load an agent profile from a YAML file.
 *
 * @param profilePath - Absolute path to the profile file
 * @param options - Optional loading configuration
 * @returns Parsed agent profile
 * @throws {PathTraversalError} If path is outside allowed directory
 *
 * @example
 * ```typescript
 * const profile = await loadProfile('/path/to/agent.yaml');
 * console.log(profile.name); // 'my-agent'
 * ```
 */
export async function loadProfile(
  profilePath: string,
  options: LoadOptions = {}
): Promise<AgentProfile> {
  // Implementation
}
```

### File Organization

```
src/
├── core/           # Core modules
├── agents/         # Agent system
├── providers/      # AI provider integrations
├── cli/            # CLI commands
├── types/          # TypeScript types
└── utils/          # Utility functions
```

### Error Handling

- Use custom error classes
- Provide meaningful error messages
- Include error context
- Handle errors gracefully

```typescript
// Good
if (!isValidPath(path)) {
  throw new PathTraversalError(
    `Invalid path: ${path}`,
    { path, allowedDir }
  );
}

// Bad
if (!isValidPath(path)) {
  throw new Error('bad path');
}
```

### Performance

- Avoid unnecessary computations
- Use caching where appropriate
- Lazy load when possible
- Profile performance-critical code

## Project Structure

### Important Files

- `src/` - Source code
- `tests/` - Test suites
- `docs/` - Documentation
- `PRD/` - Product requirements
- `examples/` - Example configurations

### Key Modules

1. **Core** (`src/core/`)
   - `config.ts` - Configuration management
   - `logger.ts` - Logging system
   - `path-resolver.ts` - Path resolution
   - `memory-manager.ts` - Memory persistence
   - `router.ts` - Provider routing

2. **Agents** (`src/agents/`)
   - `profile-loader.ts` - Profile loading
   - `abilities-manager.ts` - Abilities management
   - `context-manager.ts` - Execution context

3. **CLI** (`src/cli/`)
   - Command implementations
   - User interface

## Getting Help

- Check existing [documentation](docs/)
- Search [existing issues](https://github.com/defai-digital/automatosx/issues)
- Open a new issue for questions, bugs, or feature requests
  - Use "bug" label for bugs
  - Use "enhancement" label for feature requests/wishlist
  - Use "question" label for questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:

- CHANGELOG.md
- GitHub contributors page
- Release notes (for significant contributions)

Thank you for contributing to AutomatosX! 🚀
