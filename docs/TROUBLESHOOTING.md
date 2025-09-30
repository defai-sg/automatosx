# AutomatosX Troubleshooting Guide

This guide provides solutions to common problems you might encounter while using AutomatosX. If your issue isn't
listed here, consider running `automatosx health` for a detailed diagnostic.

## Installation & Setup Issues

**Symptom:** `npm install` fails with errors related to `node-gyp` or other native modules.

* **Solution:** AutomatosX relies on some dependencies that require native compilation. Ensure you have a proper build
  environment set up for your operating system. This typically includes Python, a C++ compiler (like GCC, Clang, or
  MSVC), and related tools. For detailed instructions, search for `node-gyp` installation prerequisites for your
  specific OS.

**Symptom:** The `claude` or other provider CLI command is not found after installation.

* **Solution 1:** Ensure that the global `npm` bin directory is in your system's `PATH`. You can find the location by
  running `npm config get prefix`. Add this location (e.g., `/usr/local/bin` or `%AppData%\npm`) to your `PATH`
  environment variable.
* **Solution 2:** You may have installed the package locally by mistake. Try running the installation command again
  with the `-g` flag (e.g., `npm install -g @anthropic-ai/claude-code`).

## Agent & Task Execution Issues

**Symptom:** An agent gives a generic or unhelpful response, or seems to ignore its specialized knowledge.

* **Solution 1:** The agent's abilities might not have been loaded correctly. Run the re-initialization script to
  force a reload of all profiles and abilities:
    ```bash
    node src/scripts/dynamic-init.js full
    ```
* **Solution 2:** The task description might be too ambiguous. Try rephrasing the task to be more specific and to
  include keywords that align with the agent's defined specializations.
* **Solution 3:** The relevant knowledge may not exist in the agent's abilities. Consider editing the Markdown files
  in `src/agents/{role}/abilities/` to add the necessary information, then run the re-initialization script.

**Symptom:** A task fails with a timeout error.

* **Solution:** This usually indicates an issue with the underlying AI provider. Check the provider's status page for
  outages. You can also test the provider's health directly:
    ```bash
    node src/scripts/config-manager.js test
    ```

## Memory System Issues

**Symptom:** Memory search returns no results, or the system seems to have forgotten previous conversations.

* **Solution 1:** The memory system or its connection to the vector database might be down. Run the memory test script:
    ```bash
    automatosx memory:test
    ```
* **Solution 2:** If search results look stale, clear the vector store and re-load profiles:
    ```bash
    automatosx memory clear milvus
    # Note: Profile reloading is automatic in global installation
    ```
* **Solution 3:** If the memory is corrupted and unsalvageable, you can clear it. **Warning: This is a destructive operation.**
    ```bash
    # Back up your project state
    npm run filesystem:backup

    # Clear every memory layer
    npm start memory clear all
    ```

## Provider & Connectivity Issues

**Symptom:** The application fails to start, complaining about provider authentication.

* **Solution:** You need to be authenticated with the CLI tool for at least one configured provider. For the primary
  provider, Claude, run:
    ```bash
    claude auth login
    ```
    Follow the prompts to log in. For other providers like `gcloud` or `openai`, follow their respective
    authentication procedures.

**Symptom:** The system is slow or unresponsive, and you suspect a provider is down.

* **Solution:** AutomatosX has a built-in circuit breaker that should automatically failover to a healthy provider.
  You can check the status of all configured providers:
    ```bash
    npm run status
    ```
    and, if needed, verify the CLI tooling:
    ```bash
    node src/scripts/config-manager.js test
    ```
    This will show which providers are healthy, in a degraded state, or completely unavailable.

## Performance & Optimization Issues

**Symptom:** AutomatosX feels slow or unresponsive, especially during agent execution.

* **Solution 1:** Check system resource usage. AutomatosX relies on vector embeddings and memory operations that can be
  CPU/memory intensive:
    ```bash
    npm run optimize                     # Analyze system performance
    node src/scripts/performance-benchmark.js  # Optional benchmark report
    ```
* **Solution 2:** If memory operations are slow, try clearing old conversation data:
    ```bash
    npm start memory cleanup          # Inspect cleanup options
    npm start memory clear milvus      # Reset the vector index if it is stale
    ```
* **Solution 3:** For persistent performance issues, check the memory server status:
    ```bash
    npm run memory:test      # Test memory server connectivity
    npm run memory:server    # Restart memory server if needed
    ```

**Symptom:** Agent responses are inconsistent or seem to ignore recent conversations.

* **Solution:** This often indicates memory synchronization issues. Check memory system integrity:
    ```bash
    npm start memory stats                 # Check memory statistics
    npm start memory history backend         # Inspect recent conversations for a role
    npm run filesystem:validate              # Validate file system integrity
    ```

## Advanced Memory System Issues

**Symptom:** Vector database connection errors or Milvus-related failures.

* **Solution 1:** AutomatosX uses a hybrid memory approach. If Milvus fails, it should fallback to SQLite. Check the
  current status:
    ```bash
    npm start memory stats
    ```
* **Solution 2:** If vector search is completely broken, reset the vector store and reload agent data:
    ```bash
    # Backup first (important!)
    npm run filesystem:backup

    # Clear only the vector database, keep chat history
    npm start memory clear milvus

    # Reload generated assets
    node src/scripts/dynamic-init.js full
    ```
* **Solution 3:** For persistent vector database issues, check if the Milvus service is running:
    ```bash
    # The embedded Milvus should start automatically, but you can verify:
    npm run memory:server
    npm run memory:test
    ```

**Symptom:** Memory search returns irrelevant results or no results for queries that should match.

* **Solution:** The vector embeddings may be corrupted or outdated. Rebuild the semantic index:
    ```bash
    npm start memory stats                 # Inspect stored conversations
    npm start memory clear milvus          # Reset embeddings if relevance drops
    ```

## Configuration & Profile Issues

**Symptom:** Custom agent abilities or profile changes aren't being recognized.

* **Solution 1:** Ensure you've re-initialized the system after making changes:
    ```bash
    /ax:init                        # Via Claude Code (preferred)
    # OR
    node src/scripts/dynamic-init.js full       # Direct command
    ```
* **Solution 2:** Check for YAML syntax errors in agent profiles:
    ```bash
    npm run validate               # Validate all agent profiles
    node src/scripts/dynamic-init.js validate  # Validate profiles and abilities
    ```
* **Solution 3:** If profile changes aren't being loaded, check file permissions and paths:
    ```bash
    npm run filesystem:validate    # Check file system integrity
    ls -la src/agents/*/profile.yaml  # Verify profile files exist and are readable
    ```

## Advanced Diagnostic Commands

**For Deep System Analysis:**

```bash
# Aggregate health + provider check
npm run health
npm run status

# Performance snapshots
npm run optimize
node src/scripts/performance-benchmark.js

# Memory visibility
npm start memory stats
npm start memory recent

# Provider tooling validation
node src/scripts/config-manager.js test

# Filesystem integrity
npm run filesystem:validate
```

**Log Analysis:**

```bash
ls -R .defai/workspaces/logs/                      # Locate recent logs
tail -n 50 .defai/workspaces/logs/provider-usage.log
```

## Emergency Recovery Procedures

**Complete System Reset (Nuclear Option):**

If all else fails and you need to start fresh while preserving your data:

```bash
# 1. Backup everything important
npm run filesystem:backup
# Optionally archive .defai/memory and .claude/memory for safekeeping

# 2. Complete factory reset
npm run factory-reset

# 3. Verify clean state
npm run validate
npm run health

# 4. Restore user data if needed
# (Factory reset preserves user data by default, but backup is always safer)
```

**Partial Recovery:**

For less drastic recovery, try these progressive steps:

```bash
# Step 1: Reset configurations only
npm run reset:config

# Step 2: If that doesn't work, reset memory
npm run reset:memory

# Step 3: If still issues, reset providers
npm run reset:providers

# Step 4: Nuclear option - reset everything
npm run reset:all
```

## Getting Additional Help

If your issue isn't covered here:

1. **Check System Health**: Run `npm run health` for automated diagnostics
2. **Review Architecture**: See **[ARCHITECTURE.md](ARCHITECTURE.md)** for system internals
3. **Performance Issues**: See **[OPERATIONS.md](OPERATIONS.md#monitoring-and-metrics)** for monitoring commands
4. **Development Issues**: See **[DEVELOPMENT.md](DEVELOPMENT.md#debugging-and-testing)** for development troubleshooting

> **Pro Tip**: When reporting issues, always include the output of `npm run health` and `npm run status` for faster diagnosis.
