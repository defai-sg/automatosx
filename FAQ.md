# Frequently Asked Questions (FAQ)

## General Questions

### What is AutomatosX?

AutomatosX is an AI agent orchestration platform that allows you to create, configure, and run AI agents with different capabilities and behaviors. It supports multiple AI providers (Claude, Gemini, OpenAI) and features a powerful memory system with vector search.

### What's new in v4.0?

v4.0 is a complete TypeScript rewrite with major improvements:
- **87% smaller**: Bundle reduced from 340MB to <50MB
- **SQLite + vec**: Replaced Milvus with lightweight SQLite-based vector search
- **TypeScript**: 100% type-safe codebase
- **Better security**: Enhanced path resolution and workspace isolation
- **Faster**: 60% faster startup, 62x faster vector search

See [CHANGELOG.md](./CHANGELOG.md) for detailed changes.

### Can I migrate from v3.x to v4.0?

No, v4.0 requires a clean installation due to major breaking changes:
- Database format changed (Milvus → SQLite)
- Configuration format changed (YAML → JSON)
- Directory structure changed (`.defai/` → `.automatosx/`)
- API completely rewritten in TypeScript

**Recommendation**: Install v4.0 in a new project and configure from scratch.

### What AI providers are supported?

AutomatosX supports:
- **Claude** (Anthropic): claude-3-opus, claude-3-sonnet, claude-3-haiku
- **Gemini** (Google): gemini-1.5-pro, gemini-1.5-flash
- **OpenAI**: For embeddings (text-embedding-3-small/large)

You can use multiple providers simultaneously with automatic fallback.

### How much does it cost to use?

AutomatosX itself is free and open-source (Apache-2.0 license). However, you need API keys from providers:

- **Claude**: ~$3-15 per 1M tokens (varies by model)
- **Gemini**: Free tier available, paid tier ~$0.35-7 per 1M tokens
- **OpenAI**: ~$0.02-0.13 per 1M tokens for embeddings

Actual costs depend on your usage patterns.

## Installation & Setup

### What are the system requirements?

- **Node.js**: 20.0.0 or higher
- **OS**: macOS, Linux, or Windows
- **Memory**: 512MB RAM minimum, 2GB recommended
- **Disk**: 100MB for installation

### How do I install AutomatosX?

```bash
# Option 1: Global installation
npm install -g automatosx

# Option 2: Use with npx (no installation)
npx automatosx --help

# Option 3: Local project installation
npm install --save-dev automatosx
```

### How do I set up API keys?

```bash
# Method 1: Environment variables (recommended for development)
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="your-key"
export OPENAI_API_KEY="sk-..."

# Method 2: Configuration file (recommended for production)
automatosx init
automatosx config --set providers.claude.apiKey --value "sk-ant-..."
automatosx config --set providers.gemini.apiKey --value "your-key"

# Method 3: Per-command
automatosx run assistant "hello" --api-key "sk-ant-..."
```

### Can I use AutomatosX without API keys?

No, you need at least one provider API key to use AutomatosX. However:
- Gemini offers a generous free tier
- You can use different providers for different tasks
- Tests run with mock providers (no API needed)

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

```bash
# Set preferred provider
automatosx config --set providers.preferred --value claude

# Or specify per command
automatosx run assistant "hello" --provider gemini
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

### How do I create a custom agent?

```bash
# 1. Create agent profile
cat > .automatosx/agents/my-agent.yaml << EOF
name: my-agent
description: My custom agent
model: claude-3-sonnet-20240229
temperature: 0.7
abilities:
  - search
  - code_analysis
systemPrompt: |
  You are a helpful assistant specialized in...
EOF

# 2. Test agent
automatosx run my-agent "Hello, introduce yourself"
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

AutomatosX stores conversation history and data in a SQLite database with vector search:
- **Storage**: `.automatosx/memory.db`
- **Vector search**: HNSW algorithm via sqlite-vec extension
- **Embeddings**: OpenAI text-embedding-3-small (default)

Memories persist across sessions and can be searched semantically.

### How do I search memories?

```bash
# Semantic search
automatosx memory search "how to implement authentication"

# List all memories
automatosx memory list

# Limit results
automatosx memory search "query" --limit 10
```

### Can I export/import memories?

```bash
# Export to JSON
automatosx memory export --output backup.json

# Import from JSON
automatosx memory import --input backup.json

# Validate before import
automatosx memory import --input backup.json --validate
```

### How do I clear old memories?

```bash
# Option 1: Export, edit, re-import
automatosx memory export --output backup.json
# Edit backup.json to remove unwanted entries
rm .automatosx/memory.db
automatosx memory import --input backup.json

# Option 2: Delete database (nuclear option)
rm .automatosx/memory.db
# Will be recreated on next use
```

### Why do I need OpenAI API for memory search?

Vector search requires converting text to numerical embeddings. AutomatosX uses OpenAI's embedding API by default because it's:
- High quality
- Cost-effective ($0.02 per 1M tokens)
- Fast and reliable

You can configure a different embedding provider if needed.

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

### Vector search returns no results

Verify memories exist and embedding provider is configured:
```bash
automatosx memory list
automatosx config --get providers.openai.embeddingApiKey
```

## Development & Contributing

### How do I contribute to AutomatosX?

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

Quick start:
```bash
git clone https://github.com/defai-sg/automatosx.git
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

1. Check [existing issues](https://github.com/defai-sg/automatosx/issues)
2. Create a [new issue](https://github.com/defai-sg/automatosx/issues/new)
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
- API keys (sensitive!)
- Local database
- Conversation history
- Agent workspaces

**Do commit**: Agent profiles and abilities if you want to share them.

## Licensing & Usage

### What license does AutomatosX use?

Apache License 2.0 - free for commercial and personal use.

### Can I use AutomatosX commercially?

Yes! Apache 2.0 license allows commercial use with no restrictions.

### Do I need to credit AutomatosX?

Not required, but appreciated! You can mention:
```
Powered by AutomatosX (https://github.com/defai-sg/automatosx)
```

---

## Still Have Questions?

- **GitHub Discussions**: [Ask the community](https://github.com/defai-sg/automatosx/discussions)
- **Discord**: [Join our Discord](https://discord.gg/automatosx)
- **Email**: support@defai.digital
- **Twitter**: [@automatosx](https://twitter.com/automatosx)
