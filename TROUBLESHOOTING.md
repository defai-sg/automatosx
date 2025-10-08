# Troubleshooting Guide

This guide helps you resolve common issues when using AutomatosX.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [Memory System Issues](#memory-system-issues)
- [Provider Issues](#provider-issues)
- [Agent Execution Problems](#agent-execution-problems)
- [Performance Issues](#performance-issues)
- [Error Messages](#error-messages)

---

## Installation Issues

### Error: Node version not supported

**Symptom**: Installation fails with error about Node.js version

**Solution**:

```bash
# Check your Node version
node --version

# AutomatosX requires Node.js 20 or higher
# Install Node 20+ using nvm (recommended)
nvm install 20
nvm use 20

# Or use n
npm install -g n
n 20
```

### Error: SQLite compilation fails

**Symptom**: `better-sqlite3` or `sqlite-vec` fails to compile

**Solution**:

```bash
# On macOS
xcode-select --install

# On Ubuntu/Debian
sudo apt-get install build-essential python3

# On Windows
# Install windows-build-tools
npm install --global windows-build-tools

# Try clean install
rm -rf node_modules package-lock.json
npm install
```

### Error: Permission denied during global install

**Symptom**: `EACCES: permission denied` when running `npm install -g`

**Solution**:

```bash
# Option 1: Use npx (recommended)
npx automatosx --help

# Option 2: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Then install again
npm install -g automatosx
```

---

## Configuration Problems

### Error: Config file not found

**Symptom**: `Configuration file not found`

**Solution**:

```bash
# Initialize configuration in your project
automatosx init

# Or manually create config
mkdir -p .automatosx
cat > .automatosx/config.json << EOF
{
  "$schema": "https://automatosx.dev/schema/config.json",
  "version": "4.0.0",
  "providers": {
    "claude": {
      "apiKey": "sk-ant-..."
    }
  }
}
EOF
```

### Error: Invalid API key

**Symptom**: `Invalid API key` or `401 Unauthorized`

**Solution**:

```bash
# Check your API key is set
automatosx config --get providers.claude.apiKey

# Set API key via config
automatosx config --set providers.claude.apiKey --value "sk-ant-..."

# Or use environment variable
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="your-key"
export OPENAI_API_KEY="sk-..."
```

### Config priority not working as expected

**Issue**: Config from wrong location is being used

**Explanation**: AutomatosX loads config in this priority order:

1. `.automatosx/config.json` (project-specific)
2. `automatosx.config.json` (project root)
3. `~/.automatosx/config.json` (user global)

**Solution**:

```bash
# Check which config file is being used
automatosx config

# Use --config flag to specify exact file
automatosx run assistant "hello" --config /path/to/config.json
```

---

## Memory System Issues

### Database locked error

**Symptom**: `Error: database is locked`

**Solution**:

```bash
# Check for other AutomatosX processes
ps aux | grep automatosx

# Kill hanging processes
pkill -f automatosx

# If problem persists, backup and recreate database
cp .automatosx/memory.db .automatosx/memory.db.backup
rm .automatosx/memory.db
automatosx memory list  # Will recreate database
```

### Vector search returns no results

**Symptom**: Memory search returns empty results despite having data

**Solution**:

```bash
# Check if memories exist
automatosx memory list

# Check embedding provider is configured
automatosx config --get providers.openai.embeddingApiKey

# Rebuild vector index
automatosx memory export --output backup.json
rm .automatosx/memory.db
automatosx memory import --input backup.json
```

### Memory export/import fails

**Symptom**: Export or import command fails with validation errors

**Solution**:

```bash
# Export with validation disabled (not recommended)
automatosx memory export --output backup.json --no-validate

# Check export file format
cat backup.json | jq '.[0]'
# Should have: content, timestamp, metadata, embedding

# Import with validation to see specific errors
automatosx memory import --input backup.json --validate
```

---

## Provider Issues

### Claude API errors

**Error**: `overloaded_error` or `rate_limit_error`

**Solution**:

```bash
# Wait and retry (AutomatosX has built-in retry logic)
# Or reduce request rate by adjusting config

automatosx config --set providers.claude.maxRetries --value 5
automatosx config --set providers.claude.retryDelay --value 2000
```

**Error**: `context_length_exceeded`

**Solution**:

```bash
# Use a model with larger context window
automatosx config --set providers.claude.model --value claude-3-opus-20240229

# Or reduce input size
# - Truncate long files
# - Summarize previous conversation history
# - Use fewer examples in prompts
```

### Gemini API errors

**Error**: `RESOURCE_EXHAUSTED`

**Solution**:

```bash
# Gemini has aggressive rate limits on free tier
# Use exponential backoff (already built in)
# Or upgrade to paid tier

# Switch to Claude as fallback
automatosx config --set providers.preferred --value claude
```

### Provider selection not working

**Symptom**: Wrong provider is being used

**Solution**:

```bash
# Check provider configuration
automatosx config --list | grep -A 20 "Providers"

# Set preferred provider
automatosx config --set providers.preferred --value claude

# Or specify provider in command
automatosx run assistant "hello" --provider claude
```

---

## Agent Execution Problems

### Agent not found

**Symptom**: `Agent profile not found: <name>`

**Solution**:

```bash
# List available agents
automatosx list agents

# Check agent paths configuration
automatosx config --get paths.agents

# Verify agent profile exists
ls -la .automatosx/agents/
ls -la ~/.automatosx/agents/

# Agent profile should be: <name>.yaml
cat .automatosx/agents/assistant.yaml
```

### Ability files not loaded

**Symptom**: Agent cannot find abilities

**Solution**:

```bash
# List available abilities
automatosx list abilities

# Check abilities path
automatosx config --get paths.abilities

# Verify ability files exist (should be .md files)
ls -la .automatosx/abilities/
```

### Agent execution timeout

**Symptom**: `Error: Execution timeout`

**Solution**:

```bash
# Increase timeout in agent profile
cat > .automatosx/agents/assistant.yaml << EOF
name: assistant
description: General-purpose assistant
timeout: 300000  # 5 minutes (default is 60000)
abilities:
  - search
  - code_analysis
EOF

# Or in config
automatosx config --set agents.defaultTimeout --value 300000
```

### Path resolution errors

**Symptom**: `Path outside project boundary` or `Invalid path`

**Solution**:

```bash
# AutomatosX prevents path traversal for security
# Paths must be within project directory

# Check your project root
automatosx status

# Use absolute paths within project
automatosx run assistant "analyze /full/path/to/project/src/file.ts"

# Not allowed:
automatosx run assistant "analyze ../../etc/passwd"  # ❌ Path traversal
```

---

## Performance Issues

### Slow startup time

**Issue**: CLI takes long to start

**Solution**:

```bash
# Enable lazy loading (should be default)
automatosx config --set performance.lazyLoad --value true

# Warm cache for faster subsequent runs
automatosx status  # This warms the cache

# Check if cache is working
automatosx config --get performance.cache.enabled
```

### High memory usage

**Issue**: AutomatosX uses too much RAM

**Solution**:

```bash
# Reduce cache size
automatosx config --set performance.cache.maxSize --value 50

# Reduce memory entries limit
automatosx config --set memory.maxEntries --value 5000

# Clear old memories
automatosx memory list
# Delete old or unneeded memories manually
```

### Vector search is slow

**Issue**: Memory search takes too long

**Solution**:

```bash
# Check database size
ls -lh .automatosx/memory.db

# Optimize database
sqlite3 .automatosx/memory.db "VACUUM; ANALYZE;"

# Reduce search results
automatosx memory search "query" --limit 10  # Default is 50

# Consider cleaning old memories
automatosx memory export --output backup.json
# Edit backup.json to remove old entries
rm .automatosx/memory.db
automatosx memory import --input backup.json
```

---

## Error Messages

### `ENOENT: no such file or directory`

**Cause**: Missing configuration or agent files

**Solution**: See [Agent not found](#agent-not-found) or [Config file not found](#error-config-file-not-found)

### `SQLITE_CANTOPEN: unable to open database file`

**Cause**: Insufficient permissions or missing directory

**Solution**:

```bash
# Check directory permissions
ls -la .automatosx

# Create directory with correct permissions
mkdir -p .automatosx
chmod 755 .automatosx

# Recreate database
rm .automatosx/memory.db
automatosx memory list
```

### `SyntaxError: Unexpected token`

**Cause**: Invalid JSON in config file

**Solution**:

```bash
# Validate JSON syntax
cat .automatosx/config.json | jq .

# If invalid, reset to defaults
automatosx config --reset
```

### `Error: Cannot find module`

**Cause**: Dependencies not installed properly

**Solution**:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# For global installation
npm uninstall -g automatosx
npm install -g automatosx

# Or use npx
npx automatosx --help
```

---

## Getting More Help

If your issue is not covered here:

1. **Check Documentation**:
   - [README.md](./README.md) - Getting started guide
   - [FAQ.md](./FAQ.md) - Frequently asked questions
   - [API Documentation](./docs/) - Detailed API reference

2. **Search Issues**: Check [GitHub Issues](https://github.com/defai-sg/automatosx/issues)

3. **Enable Debug Logging**:

   ```bash
   automatosx run assistant "hello" --debug
   ```

4. **Get System Info**:

   ```bash
   automatosx status
   node --version
   npm --version
   ```

5. **Report a Bug**: [Create an issue](https://github.com/defai-sg/automatosx/issues/new)
   - Include debug output
   - Include system info
   - Describe steps to reproduce

6. **Join Community**:
   - Discord: [discord.gg/automatosx](https://discord.gg/automatosx)
   - Discussions: [GitHub Discussions](https://github.com/defai-sg/automatosx/discussions)
