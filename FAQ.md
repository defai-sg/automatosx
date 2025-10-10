# Frequently Asked Questions (FAQ)

## General Questions

### What is AutomatosX?

AutomatosX is an AI agent orchestration platform that allows you to create, configure, and run AI agents with different capabilities and behaviors. It supports multiple AI providers (Claude, Gemini, Codex) with intelligent fallback, and features a powerful memory system with vector search.

### What's new in v5.0.1?

v5.0.1 (October 2025) includes critical bug fixes:

- **Provider timeout fixed**: All provider timeouts increased from 5 min → 15 min to match agent timeout
- **Delegation parser improved**: Zero false positives from documentation examples
- **FTS5 search stabilized**: Enhanced special character handling (15+ characters)
- **1050 tests passing**: 100% pass rate with comprehensive test coverage

**Update recommended if you experience:**
- Agent timeout errors on complex tasks
- Unwanted delegation cycles
- FTS5 "syntax error" warnings

### What's new in v5.0.0?

v5.0.0 (October 2025) introduces agent template system:

- **Quick agent creation**: Create agents from templates with `ax agent create`
- **5 pre-built templates**: Developer, analyst, designer, qa-specialist, basic-agent
- **Complete CLI toolset**: `ax agent` command suite (templates, create, list, show, remove)
- **No hardcoded values**: All execution parameters now configurable

### What's new in v4.11.0?

v4.11.0 (October 2025) removes vector search for pure FTS5:

- **No embedding costs**: Removed OpenAI embedding dependency
- **< 1ms search**: Pure SQLite FTS5 for blazing fast text search
- **Better privacy**: All data stays local (no cloud API calls)
- **Simpler**: No vector dependencies, just SQLite

### What's new in v4.10.0?

v4.10.0 (October 2025) introduces team-based configuration:

- **No duplication**: Agents inherit settings from their team
- **4 built-in teams**: Core, Engineering, Business, Design
- **Shared abilities**: Team-wide abilities automatically included
- **Centralized management**: Change provider for entire team at once

### What's new in v4.0?

v4.0 is a complete TypeScript rewrite with major improvements:

- **87% smaller**: Bundle reduced from 340MB to <50MB
- **CLI-based**: No API keys stored, uses provider CLI tools
- **TypeScript**: 100% type-safe codebase
- **Better security**: Enhanced path resolution and workspace isolation
- **Faster**: 60% faster startup, 62x faster search

See [CHANGELOG.md](./CHANGELOG.md) for detailed changes.

### Can I migrate from v3.x to v4.0?

No, v4.0 requires a clean installation due to major breaking changes:

- Database format changed (Milvus → SQLite)
- Configuration format changed (YAML → JSON)
- Directory structure changed (`.defai/` → `.automatosx/`)
- API completely rewritten in TypeScript

**Recommendation**: Install v4.0 in a new project and configure from scratch.

### What AI providers are supported?

AutomatosX supports multiple AI providers through their official CLI tools:

- **Claude** (via `claude` CLI): Latest Sonnet and other Claude models
- **Gemini** (via `gemini` CLI): gemini-1.5-pro, gemini-1.5-flash, and newer models
- **OpenAI** (via `codex` CLI): GPT-4, GPT-3.5, and other OpenAI models

**How it works**: AutomatosX calls your installed CLI commands (`claude`, `gemini`, `codex`). Each CLI uses its own authentication and automatically updates to the latest models.

You can use multiple providers simultaneously with automatic fallback.

### How much does it cost to use?

AutomatosX itself is **free and open-source** (Apache-2.0 license).

**Pricing model (v4.0+)**:
- You pay only for what you use via your existing CLI subscriptions
- No API keys stored in AutomatosX
- No additional subscription fees
- **10× more cost-effective** than expensive assistant APIs

**Provider costs** (pay directly to provider):
- **Claude**: ~$3-15 per 1M tokens (varies by model)
- **Gemini**: Free tier available, paid tier ~$0.35-7 per 1M tokens
- **OpenAI**: ~$0.02-0.06 per 1M tokens (via Codex CLI)

Actual costs depend on your usage patterns and chosen models.

## Installation & Setup

### What are the system requirements?

- **Node.js**: 20.0.0 or higher
- **OS**: macOS, Linux, or Windows
- **Memory**: 512MB RAM minimum, 2GB recommended
- **Disk**: 100MB for installation

### How do I install AutomatosX?

```bash
# Step 1: Install AutomatosX CLI
npm install -g @defai.digital/automatosx

# Step 2: Install at least one provider CLI
# Option A: Claude Code CLI
npm install -g @anthropic-ai/claude-code
# Or: curl -fsSL https://claude.ai/install.sh | bash
# Or: brew install --cask claude-code

# Option B: Gemini CLI
npm install -g @google/gemini-cli

# Option C: Codex CLI (OpenAI)
npm install -g @openai/codex
# Or: brew install codex
# Docs: https://github.com/openai/codex

# Step 3: Verify installation
ax --version
```

**Alternative (no installation)**:
```bash
npx @defai.digital/automatosx --help
```

### How do I set up authentication?

**v4.0+ (Current)**: AutomatosX uses CLI tools, which handle authentication separately:

```bash
# Each CLI has its own auth setup:

# Claude CLI
claude auth login
# Follow the prompts to authenticate

# Gemini CLI
gemini auth login
# Follow the prompts to authenticate

# Codex CLI
codex auth login
# Follow the prompts to authenticate
```

**No API keys needed in AutomatosX** - the CLI tools handle all authentication!

**For older versions (v3.x)**: Used API keys directly (see migration guide)

### Can I use AutomatosX without any provider CLIs?

No, you need at least one provider CLI installed and authenticated:

- **Recommended**: Install `claude` CLI (most capable)
- **Free option**: Gemini CLI offers generous free tier
- **For testing**: Use mock providers (`AUTOMATOSX_MOCK_PROVIDERS=true`)

```bash
# Test without real providers
export AUTOMATOSX_MOCK_PROVIDERS=true
ax run assistant "Hello"
```

## Configuration

### Where should I put my config file?

AutomatosX looks for config in this order:

1. `.automatosx/config.json` (project-specific) ⭐ **Recommended**
2. `automatosx.config.json` (project root)
3. `~/.automatosx/config.json` (user global)

Create project-specific config:

```bash
automatosx init
```

### How do I change the default provider?

**v4.10.0+ (Team-based)**: Configure at team level:

```bash
# Edit team configuration
# .automatosx/teams/engineering.yaml
provider:
  primary: codex
  fallbackChain: [codex, gemini, claude]
```

**Per-command override**:

```bash
# Specify provider for single command
ax run assistant "hello" --provider gemini

# Provider selection priority:
# 1. CLI option (--provider)
# 2. Team config
# 3. Agent config (deprecated)
# 4. Router fallback
```

### Can I have different configs for different projects?

Yes! Each project can have its own `.automatosx/config.json`:

```bash
cd project-a
automatosx init  # Creates .automatosx/config.json

cd ../project-b
automatosx init  # Creates separate .automatosx/config.json
```

### How do I reset configuration to defaults?

```bash
automatosx config --reset
```

## Agents & Abilities

### What are agent templates? (v5.0.0+)

**Agent templates** are pre-configured agent blueprints that let you create new agents in seconds instead of writing YAML from scratch.

**5 Built-in Templates**:
- `basic-agent` - Minimal configuration (core team)
- `developer` - Software development (engineering team)
- `analyst` - Business analysis (business team)
- `designer` - UI/UX design (design team)
- `qa-specialist` - Quality assurance (core team)

**Quick Start**:
```bash
# Interactive creation (guided prompts)
ax agent create my-agent --template developer --interactive

# One-line creation
ax agent create backend --template developer \
  --display-name "Bob" \
  --role "Backend Engineer" \
  --team engineering
```

**Benefits**:
- ✅ 10-20x faster than manual creation
- ✅ Consistent structure and best practices
- ✅ Auto-assigned to appropriate teams
- ✅ Beginner-friendly with interactive mode

See [Agent Templates Guide](docs/guide/agent-templates.md) for details.

### What is team-based configuration? (v4.10.0+)

**Team-based configuration** organizes agents into teams with shared settings, eliminating configuration duplication.

**4 Built-in Teams**:
- **core** - QA specialists (primary: claude)
- **engineering** - Software development (primary: codex)
- **business** - Product & planning (primary: gemini)
- **design** - Design & content (primary: gemini)

**Example**:
```yaml
# Agent inherits provider + shared abilities from team
name: backend
team: engineering        # Inherits codex provider + team abilities
role: Backend Engineer
abilities:
  - backend-development  # Agent-specific abilities
```

**Benefits**:
- ✅ No provider configuration duplication
- ✅ Change provider for entire team at once
- ✅ Shared abilities automatically included
- ✅ Clear organizational structure

See [Team Configuration Guide](docs/guide/team-configuration.md) for details.

### What's the difference between agents and abilities?

- **Agents**: High-level personas with goals and behaviors (YAML files)
- **Abilities**: Specific skills or tools agents can use (Markdown files)

Example:

```yaml
# Agent: .automatosx/agents/researcher.yaml
name: researcher
description: Research and analysis specialist
abilities:
  - web_search    # Ability
  - summarize     # Ability
  - code_analysis # Ability
```

### How do I update my agents to use teams? (v4.10.0+)

**Migration Steps**:

1. **Identify common configurations** across your agents
2. **Choose appropriate team** (core, engineering, business, design)
3. **Update agent profile**:

```yaml
# Before v4.10.0
name: backend
provider: codex
temperature: 0.7
abilities:
  - code-generation
  - backend-development

# After v4.10.0
name: backend
team: engineering       # Add this line
abilities:
  - backend-development # Remove duplicated abilities
```

4. **Test the agent**:
```bash
ax agent show backend  # Verify team assignment
ax run backend "test"  # Test execution
```

Team abilities (like `code-generation`) are automatically inherited.

### How do I create a custom agent?

**v5.0.0+ (Recommended)**: Use agent templates:

```bash
# Interactive mode - guided creation
ax agent create my-agent --template developer --interactive

# One-line creation
ax agent create my-agent \
  --template developer \
  --display-name "Mike" \
  --role "Senior Backend Engineer" \
  --team engineering

# List available templates
ax agent templates

# Available templates: developer, analyst, designer, qa-specialist, basic-agent
```

**Manual creation (advanced)**:

```bash
# 1. Create agent profile (v4.10.0+ team-based config)
cat > .automatosx/agents/my-agent.yaml << EOF
name: my-agent
team: engineering              # Inherits provider from team
displayName: "Mike"
description: My custom agent
abilities:
  - search
  - code_analysis
systemPrompt: |
  You are a helpful assistant specialized in...
EOF

# 2. Test agent
ax run my-agent "Hello, introduce yourself"
# Or use display name: ax run Mike "..."
```

See [examples/agents/](./examples/agents/) for more examples.

### How do I create custom abilities?

```bash
# Create ability file
cat > .automatosx/abilities/my-ability.md << EOF
# My Ability

Description of what this ability does.

## Usage
\`\`\`
Example usage instructions
\`\`\`

## Examples
Concrete examples of using this ability
EOF
```

Abilities are referenced in agent profiles and injected into prompts.

### Can agents access my files?

Yes, but with security restrictions:

- **Read access**: Validated paths within your project directory
- **Write access**: Only to `.automatosx/workspaces/<agent-name>/`
- **Prevented**: Path traversal attacks (`../../etc/passwd`)

This ensures agents can read your code but only write to isolated workspaces.

## Memory System

### How does the memory system work?

**v4.11.0+ (Current)**: AutomatosX uses pure SQLite FTS5 full-text search:

- **Storage**: `.automatosx/memory/memories.db`
- **Search**: FTS5 full-text search (< 1ms average)
- **No embeddings**: Removed OpenAI embedding dependency
- **Cost**: Zero - all local, no API calls
- **Privacy**: All data stays on your machine

**v5.0.1**: Enhanced special character handling (15+ characters supported)

Memories persist across sessions and can be searched instantly.

### How do I search memories?

```bash
# Full-text search (v4.11.0+)
ax memory search "how to implement authentication"

# List all memories
ax memory list

# Limit results
ax memory search "query" --limit 10

# v5.0.1+: Special characters are automatically handled
ax memory search "config.json settings"  # Works!
ax memory search "coverage: 95%"         # Works!
ax memory search "timeout (300ms)"       # Works!
```

### Can I export/import memories?

```bash
# Export to JSON
ax memory export --output backup.json

# Import from JSON
ax memory import --input backup.json

# Clear all memories
ax memory clear
```

### How do I clear old memories?

```bash
# Clear all memories
ax memory clear

# Backup before clearing
ax memory export --output backup.json
ax memory clear

# Delete database manually (advanced)
rm -rf .automatosx/memory/
# Will be recreated on next use
```

### Do I need any API for memory search?

**No!** (as of v4.11.0)

- Memory search uses **pure SQLite FTS5** (local, no API calls)
- No embedding costs
- No external dependencies
- All data stays on your machine
- Blazing fast (< 1ms average)

**Older versions (v3.x - v4.10.x)**: Required OpenAI API for vector embeddings (deprecated)

## Performance

### Why is startup slow?

First run loads dependencies and initializes the database. Subsequent runs should be faster due to:

- Lazy loading (on-demand module loading)
- Filesystem caching
- Pre-warmed configurations

To warm the cache:

```bash
automatosx status
```

### How can I improve performance?

```bash
# Enable all performance optimizations
automatosx config --set performance.lazyLoad --value true
automatosx config --set performance.cache.enabled --value true

# Reduce memory limit if experiencing high RAM usage
automatosx config --set memory.maxEntries --value 5000

# Use faster models
automatosx config --set providers.claude.model --value claude-3-haiku-20240307
```

### Is there a rate limit?

AutomatosX itself has no rate limits, but AI providers do:

- **Claude**: 50 requests/min (tier 1), higher for paid tiers
- **Gemini**: 60 requests/min (free), higher for paid
- **OpenAI**: Varies by tier

AutomatosX has built-in retry logic with exponential backoff.

## Troubleshooting

### Tests are failing during installation

```bash
# Tests require mock providers
export AUTOMATOSX_MOCK_PROVIDERS=true
npm test
```

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more solutions.

### `Error: database is locked`

Another AutomatosX process is using the database:

```bash
# Find and kill processes
ps aux | grep automatosx
pkill -f automatosx
```

### Configuration not being applied

Check which config file is being used:

```bash
automatosx config  # Shows config path
```

Ensure you're editing the right file based on priority order.

### Agent tasks timeout with "Request timeout after 300000ms"

**Problem**: Complex agent tasks fail with timeout errors even though the default agent timeout is 15 minutes.

**Cause**: Provider timeout (5 minutes) is shorter than agent timeout (15 minutes), causing the provider to timeout first.

**Solution (v5.0.1+)**: Update to v5.0.1 which fixes this issue automatically, or manually update your config:

```bash
# Check your current version
automatosx --version

# If < v5.0.1, update your configuration manually:
automatosx config set providers.claude-code.timeout 900000
automatosx config set providers.gemini-cli.timeout 900000
automatosx config set providers.openai.timeout 900000

# Or update to v5.0.1:
npm install -g @defai.digital/automatosx@latest
```

**Verify the fix**:
```bash
# Check provider timeout settings
automatosx config show | grep -A2 "timeout"
# Should show 900000 (15 minutes) for all providers
```

### Agents delegate to wrong agents or delegation cycles occur

**Problem**: Agents incorrectly parse documentation examples as actual delegation requests, causing unwanted delegation cycles.

**Example Error**:
```
[ERROR] Delegation cycle detected: quality -> frontend -> frontend
[INFO] Parsed 6 delegation(s)  # Should be 0
```

**Cause**: Delegation parser was too aggressive and parsed quoted examples or numbered lists as real delegations.

**Solution**: Update to v5.0.1 which includes improved delegation parsing:

```bash
npm install -g @defai.digital/automatosx@5.0.1
```

**Verification**:
```bash
# Test delegation parsing with documentation
ax run coordinator "Explain delegation syntax with examples"
# Should not trigger any false delegations
```

### FTS5 search fails with "syntax error near" message

**Problem**: Memory search fails with errors like `fts5: syntax error near "."` when query contains special characters.

**Cause**: FTS5 search was not sanitizing special characters properly (v5.0.0 and earlier).

**Solution**: Update to v5.0.1 which includes enhanced FTS5 sanitization:

```bash
npm install -g @defai.digital/automatosx@5.0.1
```

**Workaround (if can't update)**:
```bash
# Avoid special characters in memory searches
# Instead of: "config.json settings"
# Use: "config json settings"
```

### AutomatosX not working after upgrading from older version

If you're experiencing errors or unexpected behavior after upgrading, it may be due to:

- **Old agent profiles** (YAML format or schema changes)
- **Outdated configuration** (incompatible settings from previous versions)
- **Old database format** (v3.x Milvus → v4.x SQLite migration)

**Solution**: Reinitialize your AutomatosX setup with the force flag:

```bash
# Force reinitialize (overwrites existing configuration)
ax init -f

# This will:
# - Create fresh .automatosx/ directory structure
# - Generate updated agent profiles
# - Create new SQLite database
# - Reset configuration to v4.x defaults
```

**⚠️ Warning**: This will overwrite existing configuration. If you have custom agents or abilities, back them up first:

```bash
# Backup custom files before reinitializing
cp -r .automatosx/agents ./backup-agents
cp -r .automatosx/abilities ./backup-abilities
cp .automatosx/config.json ./backup-config.json

# Reinitialize
ax init -f

# Restore custom agents/abilities if needed
cp ./backup-agents/* .automatosx/agents/
cp ./backup-abilities/* .automatosx/abilities/
```

### Memory search returns no results

Verify memories exist:

```bash
ax memory list

# If empty, try storing a memory first
ax run assistant "Remember: Project Alpha launches Q1 2025"

# Then search
ax memory search "when does Alpha launch"
```

**v4.11.0+**: Vector search removed, now uses FTS5 text search (no embedding API needed)

## Development & Contributing

### How do I contribute to AutomatosX?

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

Quick start:

```bash
git clone https://github.com/defai-digital/automatosx.git
cd automatosx
npm install
npm test
```

### How do I run tests?

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# With coverage
npm run test:coverage

# Specific test
npm test memory-manager
```

### Where is the documentation?

- **README.md**: Quick start and overview
- **CHANGELOG.md**: Version history
- **FAQ.md**: This file
- **TROUBLESHOOTING.md**: Problem solving guide
- **API docs**: In `docs/` directory
- **Examples**: In `examples/` directory

### How do I report a bug?

1. Check [existing issues](https://github.com/defai-digital/automatosx/issues)
2. Create a [new issue](https://github.com/defai-digital/automatosx/issues/new)
3. Include:
   - AutomatosX version (`automatosx --version`)
   - Node version (`node --version`)
   - Steps to reproduce
   - Error messages with `--debug` flag

## Security & Privacy

### Is my data safe?

AutomatosX:

- Stores data locally in `.automatosx/` directory
- Only sends data to AI providers you configure
- Never sends data to third parties
- Uses path validation to prevent unauthorized file access

### Can agents access sensitive files?

No. AutomatosX implements security boundaries:

- Agents can only read files within project directory
- Path traversal attacks are prevented
- Agent writes are isolated to workspace directories

### Should I commit `.automatosx/` to git?

**No, add to .gitignore**:

```bash
echo ".automatosx/" >> .gitignore
```

The `.automatosx/` directory contains:

- Local database
- Conversation history
- Agent workspaces
- Session data

**v4.0+**: No API keys stored (CLIs handle auth separately)

**Do commit**: Example agent profiles and abilities in `examples/` directory if you want to share them.

## Licensing & Usage

### What license does AutomatosX use?

Apache License 2.0 - free for commercial and personal use.

### Can I use AutomatosX commercially?

Yes! Apache 2.0 license allows commercial use with no restrictions.

### Do I need to credit AutomatosX?

Not required, but appreciated! You can mention:

```
Powered by AutomatosX (https://github.com/defai-digital/automatosx)
```

---

## Still Have Questions?

- **GitHub Issues**: [Report bugs, ask questions, or request features](https://github.com/defai-digital/automatosx/issues)
  - 🐛 Bug reports: Use the bug report template
  - ✨ Feature requests/Wishlist: Use the "enhancement" label
  - ❓ Questions: Use the "question" label
- **Email**: <support@defai.digital> for private inquiries
