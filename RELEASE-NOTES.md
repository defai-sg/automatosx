# Release Notes Template

Use this template for creating release notes in CHANGELOG.md or GitHub releases.

## Release X.Y.Z - YYYY-MM-DD

### 🎯 Release Type
<!-- Choose one: Major Release / Minor Release / Patch Release / Beta Release / Alpha Release -->

### 📦 Overview
<!-- Brief summary of this release (2-3 sentences) -->

### ✨ New Features
<!-- List new features added in this release -->
- Feature name - Brief description
- Feature name - Brief description

### 🔧 Improvements
<!-- List improvements and enhancements -->
- Improvement description
- Improvement description

### 🐛 Bug Fixes
<!-- List bugs fixed in this release -->
- Bug fix description (fixes #123)
- Bug fix description (fixes #456)

### 📚 Documentation
<!-- List documentation updates -->
- Documentation update description
- Documentation update description

### ⚠️ Breaking Changes
<!-- List breaking changes (REQUIRED for major versions) -->
- Breaking change description
- Migration guide: [link or inline instructions]

### 🔄 Deprecations
<!-- List deprecated features -->
- Deprecated feature - Will be removed in vX.Y.Z
- Deprecated feature - Use alternative instead

### 📊 Performance
<!-- List performance improvements with metrics -->
- Performance improvement (X% faster)
- Bundle size reduced from XMB to YMB

### 🔒 Security
<!-- List security fixes (if any) -->
- Security fix description (CVE-YYYY-XXXXX)

### 📦 Dependencies
<!-- Major dependency updates -->
- Updated dependency X from vA to vB
- Added dependency Y for feature Z

### 🙏 Contributors
<!-- List contributors to this release -->
Thanks to @username, @username for contributions!

### 📝 Notes
<!-- Additional notes, known issues, or migration instructions -->

---

## Example: v4.0.0 - 2025-10-15

### 🎯 Release Type
Major Release - Complete TypeScript Rewrite

### 📦 Overview
AutomatosX v4.0.0 is a complete rewrite in TypeScript, replacing Milvus vector database with SQLite + vec for an 87% bundle size reduction (340MB → <50MB). This release includes breaking changes and requires fresh installation.

### ✨ New Features
- **SQLite Vector Search**: Replaced Milvus with SQLite + vec extension (HNSW algorithm)
- **TypeScript**: 100% TypeScript codebase with strict type checking
- **Path Resolution**: Enhanced security with project boundary validation
- **Agent Workspace Isolation**: Secure sandbox for agent file operations
- **Performance Optimizations**: Lazy loading, TTL caching, and profiling tools
- **Comprehensive CLI**: 7 commands with rich interactive experiences

### 🔧 Improvements
- Bundle size reduced by 87% (340MB → 46MB)
- Dependencies reduced by 73% (589 → 158 packages)
- Startup time improved by 60%
- Vector search latency: 0.72ms (vs 45ms in v3.x)
- Test coverage: 84.19% (763 tests)

### 🐛 Bug Fixes
- Fixed path traversal vulnerabilities in file access
- Fixed memory leaks in vector search operations
- Fixed CLI error handling and exit codes

### 📚 Documentation
- Complete API documentation
- User guides and tutorials
- Examples directory with real-world use cases
- Troubleshooting guide

### ⚠️ Breaking Changes
- **No migration from v3.x**: Requires clean installation due to database format changes
- **Configuration format**: Changed from YAML to JSON
- **Directory structure**: `.defai/` → `.automatosx/`
- **API changes**: Complete TypeScript rewrite with new interfaces
- **Minimum Node.js**: Now requires Node.js 20+ (was 18+)

**Migration Guide**: See [MIGRATION.md](./MIGRATION.md) for detailed instructions.

### 🔄 Deprecations
- v3.x is now in maintenance mode, will receive security updates only until 2026-01-01

### 📊 Performance
- Vector search: 0.72ms (62x faster than v3.x)
- Bundle size: 46MB (87% reduction)
- Installation time: <2 minutes (vs 8+ minutes in v3.x)
- Memory usage: 50% reduction in typical workflows

### 🔒 Security
- Added path traversal protection with boundary validation
- Implemented workspace isolation for agents
- Input sanitization for all user-provided data
- Security audit passed (see docs/SECURITY-AUDIT.md)

### 📦 Dependencies
- Removed: Milvus, ONNX Runtime, Transformers.js
- Added: better-sqlite3, sqlite-vec, yargs, chalk, boxen, ora
- Updated: All dependencies to latest stable versions

### 🙏 Contributors
Thanks to all contributors who made v4.0.0 possible!

### 📝 Notes
- This is a major rewrite focusing on simplicity and performance
- Beta testing period: 4 weeks with 10+ real-world deployments
- Known issues: None critical, see [GitHub Issues](https://github.com/defai-sg/automatosx/issues)
- Support: Join our [Discord](https://discord.gg/automatosx) for help
