# Changelog

All notable changes to AutomatosX will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Known Issues
- CLI process cleanup issue in integration tests (non-blocking, under investigation)
- CLI commands test coverage at 1.67% (improvement planned for Sprint 2.4.1)

## [4.0.0-beta.1] - 2025-10-04

### Added - Core Features

#### Complete TypeScript Rewrite
- **100% TypeScript** with strict mode enabled
- Full type definitions for all modules
- JSDoc comments for API documentation
- Zero TypeScript compilation errors

#### Memory System (SQLite + vec)
- **SQLite-based vector database** using sqlite-vec extension
- 87% size reduction from v3.x (300MB Milvus → 2-5MB SQLite)
- Text-based and vector-based memory search
- Automatic memory persistence
- Memory export/import (JSON, CSV formats)
- Memory statistics and analytics
- Configurable memory retention (auto-cleanup)

#### Agent System
- **Agent profiles** (YAML format) with role-based configuration
- **Abilities system** - Reusable skills for agents
- **Agent workspace** - Isolated execution environment
- **Context management** - Automatic context building with memory injection
- **Path resolution** with security validation (prevent path traversal)
- 5 example agents (assistant, reviewer, documenter, debugger, architect)
- 15 example abilities

#### Provider System
- **Router with automatic fallback** - Try providers in priority order
- **Health monitoring** - Periodic provider health checks
- **Timeout handling** - Configurable request timeouts
- **Rate limit detection** - Automatic retry logic
- Supported providers:
  - Claude (Anthropic) via CLI
  - Gemini (Google) via CLI
  - OpenAI (future)

#### CLI Commands
- `automatosx init` - Initialize project with config and examples
- `automatosx run <agent> <task>` - Execute agent with task
- `automatosx chat <agent>` - Interactive chat mode
- `automatosx status` - System health and provider status
- `automatosx list <type>` - List agents, abilities, providers
- `automatosx memory <command>` - Memory management (search, export, import, stats)

#### Error Handling
- **Structured error hierarchy** with 6 error classes
- **40+ error codes** (E1000-E9999) for programmatic handling
- **Actionable error messages** with suggestions
- **Error formatter** with multiple output modes
- **Error context** - Additional metadata for debugging
- Complete error code reference documentation

#### Configuration
- **JSON-based configuration** (automatosx.config.json)
- **Provider configuration** - Enable/disable, priority, timeout
- **Memory configuration** - Max entries, persistence, auto-cleanup
- **Workspace configuration** - Isolation, cleanup policy
- **Logging configuration** - Level, file output, console output
- **Migration from v3.x** - Auto-convert YAML to JSON

### Added - Documentation

#### User Documentation
- **Getting Started Guide** (400+ lines) - 5-minute quick start
- **API Documentation** (500+ lines) - Complete API reference
- **Error Codes Reference** (250+ lines) - All error codes with solutions
- **CLI Commands Reference** (NEW)
- **Configuration Guide** (NEW)
- **Troubleshooting Guide** (NEW)
- **FAQ** (NEW)

#### Developer Documentation
- Comprehensive JSDoc comments
- Type definitions for all interfaces
- Code examples in documentation
- Architecture diagrams (in PRD)

### Added - Testing

#### Test Suite
- **379 unit tests** (99.2% pass rate)
- **22 test files** covering all core modules
- **Integration tests** for CLI commands
- **60.71% code coverage** overall
- **94.92% coverage** for agent system
- **87.54% coverage** for core modules
- **100% coverage** for router and error formatter

#### Test Infrastructure
- Vitest test framework
- Coverage reporting with v8
- Mock providers for testing
- Test fixtures and utilities

### Changed - Architecture

#### Bundle Size Reduction
- **v3.x**: 340MB → **v4.0**: 152KB (99.96% reduction)
- Removed Milvus (300MB) → SQLite + vec (2-5MB)
- Removed @xenova/transformers (100MB) → OpenAI embeddings API
- Removed unnecessary dependencies: 589 → 384 (35% reduction)

#### Directory Structure
- **v3.x**: `.defai/` → **v4.0**: `.automatosx/`
- Config file: `defai.config.yaml` → `automatosx.config.json`
- Organized structure:
  ```
  .automatosx/
  ├── agents/          # Agent profiles
  ├── abilities/       # Ability definitions
  ├── memory/          # SQLite database
  ├── workspaces/      # Agent workspaces
  └── logs/            # Log files
  ```

#### Performance Improvements
- **Startup time**: <1s (previously 3-5s)
- **Memory footprint**: ~50MB (previously ~500MB)
- **Database queries**: 10x faster with SQLite vs Milvus
- **Dependency installation**: <2min (previously 10-15min)

### Changed - Migration

#### Breaking Changes from v3.x

1. **Configuration Format**
   - YAML → JSON
   - New config structure
   - Migration tool provided

2. **Memory System**
   - Milvus → SQLite + vec
   - New vector extension
   - Memory export/import for migration

3. **Directory Structure**
   - `.defai/` → `.automatosx/`
   - Auto-migration on first run

4. **CLI Commands**
   - Some command flags changed
   - New command structure
   - Backwards compatibility where possible

5. **Provider Interface**
   - CLI-based providers only
   - Direct API support removed (use CLI wrappers)

#### Migration Path
```bash
# Export v3.x memory
cd old-project
defai memory export memory-backup.json

# Initialize v4.0
cd new-project
automatosx init

# Import memory
automatosx memory import memory-backup.json
```

### Removed

#### Dependencies Removed
- ❌ Milvus (300MB)
- ❌ @xenova/transformers (~100MB)
- ❌ onnxruntime-node (92MB)
- ❌ sharp (24MB)
- ❌ 200+ unused dependencies

#### Features Removed
- ❌ Built-in transformer models (use API instead)
- ❌ Direct provider APIs (use CLI wrappers)
- ❌ Legacy YAML config support
- ❌ Old `.defai/` directory structure

### Fixed

#### Bug Fixes
- Fixed path traversal vulnerabilities in workspace creation
- Fixed memory leak in provider health checks
- Fixed race conditions in concurrent requests
- Fixed error messages not showing suggestions
- Fixed config validation edge cases

#### Security Fixes
- Added path validation to prevent directory traversal
- Restricted workspace permissions (700 on Unix)
- Sanitized error messages to prevent info leakage
- Validated all user inputs

### Security

#### New Security Features
- **Path traversal prevention** - Validate all file paths
- **Workspace isolation** - Agents run in isolated directories
- **Input sanitization** - All user inputs validated
- **Permission restrictions** - Workspace directories with restricted permissions
- **Error message sanitization** - No sensitive data in errors

#### Security Audit
- 23 security tests passing
- Path traversal prevention verified
- Input validation comprehensive
- No known vulnerabilities

### Performance

#### Benchmarks (vs v3.x)

| Metric | v3.x | v4.0 | Improvement |
|--------|------|------|-------------|
| Bundle Size | 340MB | 152KB | 99.96% |
| Dependencies | 589 | 384 | 35% |
| Startup Time | 3-5s | <1s | 80% |
| Memory Usage | ~500MB | ~50MB | 90% |
| Installation | 10-15min | <2min | 87% |

### Developer Experience

#### Improvements
- TypeScript for better IDE support
- Comprehensive error messages with suggestions
- Detailed documentation with examples
- Test coverage for confidence
- Migration tool for v3.x users

#### Developer Tools
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run test:coverage` - Coverage report
- `npm run typecheck` - Type checking
- `npm run dev` - Development mode

---

## [3.1.5] - 2024-12-15 (Legacy)

Last stable version before v4.0 rewrite.

### Known Issues in v3.x
- Large bundle size (340MB)
- Slow installation (10-15min)
- High memory usage (~500MB)
- Milvus dependency (300MB)
- Limited error handling

---

## Migration Guide

### From v3.x to v4.0

#### Step 1: Backup
```bash
# Backup your v3.x data
cd your-v3-project
defai memory export backup.json
cp -r .defai .defai.backup
```

#### Step 2: Install v4.0
```bash
npm install -g automatosx@4.0.0-beta.1
```

#### Step 3: Initialize
```bash
cd your-project
automatosx init
```

#### Step 4: Migrate Config
```bash
# v3.x config (defai.config.yaml) is auto-converted
# Manual adjustments may be needed
vi automatosx.config.json
```

#### Step 5: Import Memory
```bash
automatosx memory import backup.json
```

#### Step 6: Test
```bash
automatosx status
automatosx run assistant "test migration"
```

### Config Migration

**v3.x (YAML)**:
```yaml
providers:
  - name: claude
    enabled: true
    priority: 1
```

**v4.0 (JSON)**:
```json
{
  "providers": {
    "claude-code": {
      "enabled": true,
      "priority": 1,
      "timeout": 30000,
      "command": "claude"
    }
  }
}
```

---

## Deprecation Notices

### Deprecated in v4.0
- YAML configuration (use JSON)
- `.defai/` directory (use `.automatosx/`)
- Direct provider APIs (use CLI wrappers)

### Will be Removed in v5.0
- Migration tool (use v4.x to migrate from v3.x)
- Legacy config converter
- Backwards compatibility layer

---

## Links

- [Documentation](./docs/)
- [API Reference](./docs/API.md)
- [Error Codes](./docs/ERROR-CODES.md)
- [Getting Started](./docs/GETTING-STARTED.md)
- [GitHub](https://github.com/automatosx/automatosx)
- [Issues](https://github.com/automatosx/automatosx/issues)

---

**Note**: This is a beta release. Please report any issues on GitHub.
