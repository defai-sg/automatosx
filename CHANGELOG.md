# Changelog

All notable changes to AutomatosX will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.0] - 2025-10-07

### ✨ New Features

#### Enhanced Agent Architecture
- **7-Stage Workflow System**: Added structured multi-stage workflow support with `stages` field in agent profiles
  - Each stage includes: name, description, key_questions, outputs, model, temperature
  - Stages are automatically injected into prompts to guide agent behavior
  - Example stages: requirement_analysis, test_planning, implementation, self_code_review, refactoring, documentation, final_review
- **Personality System**: Added `personality` field to define agent traits, catchphrase, communication style, and decision-making approach
- **Thinking Patterns**: Added `thinking_patterns` field for guiding principles that shape agent decisions

#### Project-Specific Knowledge System
- **4 New Ability Templates**: Created project-specific ability templates in `examples/abilities/`
  - `our-coding-standards.md`: Team-specific coding conventions (TypeScript, ESM, security patterns)
  - `our-project-structure.md`: Directory structure and file organization
  - `our-architecture-decisions.md`: Architectural Decision Records (ADRs)
  - `our-code-review-checklist.md`: Team review process and checklists

### 🔧 Improvements
- **Enhanced Coder Profile**: Updated `coder.yaml` from 47 lines to 388 lines with comprehensive 7-stage workflow
- **Type Safety**: Added TypeScript interfaces for `Stage`, `Personality` types
- **Profile Validation**: Enhanced validation to check stages structure, personality fields, and thinking patterns

### 🐛 Bug Fixes
- **Critical**: Fixed missing validation for v4.1+ enhanced fields (stages, personality, thinking_patterns)
  - Prevented runtime crashes from malformed YAML profiles
  - Added comprehensive validation for all new fields and nested structures

### 📊 Technical Details
- **Bundle Size**: 204.50 KB (optimized from 205.64 KB)
- **Test Coverage**: 862 tests passing (added 13 new profile validation tests)
- **Documentation**: Comprehensive phase 1 implementation docs in `tmp/`

### 📖 Documentation
- Phase 1 implementation summary (`tmp/PHASE-1-COMPLETE.md`)
- Bug analysis report (`tmp/BUG-ANALYSIS-REPORT.md`)
- Bug fix completion report (`tmp/BUG-FIX-COMPLETE.md`)
- Enhanced agent architecture design docs

## [4.0.0] - 2025-10-06

### 🎉 Major Release: Complete Platform Revamp

AutomatosX v4.0.0 is a **complete rewrite from the ground up**, addressing the critical issues in v3.1 (340MB bundle, loose typing, performance bottlenecks). This release delivers an **87% bundle size reduction**, **62x faster vector search**, and **100% TypeScript type safety**.

### ✨ Key Achievements

- **87% Bundle Reduction**: 340MB → 46MB
- **73% Dependency Reduction**: 589 → 158 packages
- **62x Faster Vector Search**: 45ms → 0.72ms
- **4x Faster Installation**: 8+ min → <2 min
- **841 Tests**: 98.4% passing with 84% coverage
- **Production Ready**: Comprehensive documentation, CI/CD, release automation

### 🚨 Breaking Changes from v3.1

**⚠️ NO MIGRATION PATH** - v4.0 requires clean installation:

- **Database**: Milvus → SQLite + vec (incompatible formats)
- **Language**: JavaScript → TypeScript (complete rewrite)
- **Configuration**: YAML → JSON format
- **Directory**: `.defai/` → `.automatosx/`
- **API**: Completely redesigned with TypeScript types

**Rationale**: The architectural changes are too fundamental for migration. Users must start fresh, but gain 87% smaller bundle and 62x faster performance.

### ✨ New Features

#### Complete TypeScript Rewrite
- 100% TypeScript with strict mode
- Full type definitions for all modules
- Zero runtime type errors
- Better IDE support and refactoring

#### SQLite Vector Search
- Replaced 300MB Milvus with 2-5MB SQLite + vec
- Same HNSW algorithm, 62x faster (0.72ms vs 45ms)
- Single-file database, no external services
- Embeddable and portable

#### Enhanced Security
- Path boundary validation
- Workspace isolation for agents
- Input sanitization
- Path traversal prevention

#### Performance Optimizations
- Lazy loading for faster startup (60% improvement)
- TTL-based LRU caching
- Bundle optimization (87% reduction)
- Memory usage optimization (50% reduction)

#### Production Infrastructure
- Automated release workflow (GitHub Actions)
- Comprehensive release checklist
- Pre-release validation scripts
- Smoke tests and real provider tests
- Beta testing program

### 📚 Documentation

- **TROUBLESHOOTING.md**: 50+ common issues with solutions
- **FAQ.md**: 40+ frequently asked questions
- **CONTRIBUTING.md**: Complete contribution guidelines
- **RELEASE-CHECKLIST.md**: 150+ item release validation
- **BETA-TESTING.md**: Beta testing procedures
- **E2E-TESTING.md**: End-to-end testing guide
- **PROJECT-HISTORY.md**: Complete project evolution from v1.0 to v4.0
- **examples/**: Comprehensive examples and use cases

### 🔧 Technical Details

#### Dependencies Removed
- Milvus client (~300MB)
- ONNX Runtime (~100MB)
- Transformers.js (~50MB)
- 431 transitive dependencies

#### Dependencies Added
- TypeScript tooling
- SQLite + vec extension
- Vitest 2.x for testing

#### Code Metrics
- Source code: 28,980 → 6,200 LOC (78% reduction)
- Tests: ~200 → 841 tests (320% increase)
- Test coverage: Unknown → 84.19%
- Bundle size: 340MB → 46MB (87% reduction)

### 🔒 Security

- Fixed: esbuild CORS vulnerability (GHSA-67mh-4wv8-2f99)
- Enhanced: Path traversal prevention
- Enhanced: Workspace isolation
- Enhanced: Input validation and sanitization

### 🐛 Bug Fixes

- All v3.1 JavaScript runtime type errors eliminated
- Memory leaks in vector search operations fixed
- CLI error handling and exit codes improved
- Path resolution edge cases fixed
- Provider fallback logic corrected

### ⚡ Performance

- Vector search: 45ms → 0.72ms (62x faster)
- Installation: 8+ min → <2 min (4x faster)
- Startup: 60% faster with lazy loading
- Memory usage: 50% reduction
- Bundle size: 340MB → 46MB (87% smaller)

### 🧪 Testing

- Unit tests: 677 tests (90%+ core module coverage)
- Integration tests: 78 tests
- E2E tests: 17 tests (11 passing)
- Total: 841 tests (98.4% passing)
- Coverage: 84.19% overall

### 📦 Distribution

- Package size: 210.4 KB (tarball)
- Unpacked: 879.7 KB
- Files: 53
- Node.js: ≥20.0.0

### 🙏 Contributors

Thank you to all contributors who made v4.0 possible!

### 📝 Upgrade Guide

**From v3.1 to v4.0**:

1. **Export v3.1 data** (optional):
   ```bash
   cd v3.1-project
   automatosx memory export --output backup.json
   ```

2. **Uninstall v3.1**:
   ```bash
   npm uninstall -g automatosx
   ```

3. **Install v4.0**:
   ```bash
   npm install -g automatosx@4.0.0
   ```

4. **Initialize fresh project**:
   ```bash
   cd your-project
   automatosx init
   ```

5. **Configure providers**:
   ```bash
   automatosx config --set providers.claude.apiKey --value "sk-ant-..."
   ```

6. **Import data** (optional):
   ```bash
   automatosx memory import --input backup.json
   ```

### 🔗 Resources

- **Documentation**: https://docs.automatosx.dev
- **Repository**: https://github.com/defai-sg/automatosx
- **Issues**: https://github.com/defai-sg/automatosx/issues
- **npm**: https://www.npmjs.com/package/automatosx

---

## [Unreleased]

(Future changes will be listed here)

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
- **Configuration validation** - Comprehensive config validation

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

### Changed - Breaking Changes from v3.x

**⚠️ v4.0 requires clean installation - no automatic migration from v3.x**

1. **Configuration Format**
   - YAML → JSON
   - New config structure
   - Manual configuration required

2. **Memory System**
   - Milvus → SQLite + vec
   - New vector extension
   - Use export/import for manual data transfer if needed

3. **Directory Structure**
   - `.defai/` → `.automatosx/`
   - Clean installation required

4. **CLI Commands**
   - New command structure
   - Different command flags
   - Review documentation for command changes

5. **Provider Interface**
   - CLI-based providers only
   - Direct API support removed (use CLI wrappers)

#### For v3.x Users
- v4.0 is a complete rewrite - install it separately
- Both versions can coexist if needed
- Manually transfer data using export/import if required
- Review new documentation before switching

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
- Simplified installation process

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

## Links

- [Documentation](./docs/)
- [API Reference](./docs/API.md)
- [Error Codes](./docs/ERROR-CODES.md)
- [Getting Started](./docs/GETTING-STARTED.md)
- [GitHub](https://github.com/automatosx/automatosx)
- [Issues](https://github.com/automatosx/automatosx/issues)

---

**Note**: This is a beta release. Please report any issues on GitHub.
