# Core Concepts

Understand the fundamental concepts of AutomatosX to build powerful AI agents.

---

## Overview

AutomatosX is built around a few core concepts:

1. **Agents** - AI entities with specific roles and capabilities
2. **Profiles** - YAML configuration files that define agent behavior
3. **Abilities** - Reusable skills that agents can use
4. **Memory** - Persistent storage with vector search
5. **Providers** - AI service backends (Claude, Gemini, OpenAI)
6. **Workspaces** - Isolated execution environments

---

## Agents

### What is an Agent?

An **agent** is an AI entity configured to perform specific tasks. Each agent has:

- A **role** (assistant, coder, reviewer, etc.)
- A **system prompt** that defines its behavior
- A set of **abilities** it can use
- Access to **memory** for context
- A designated **AI provider** (Claude, Gemini, etc.)

### Agent Characteristics

**Single-Purpose**: Each agent is designed for a specific task

- ✅ `assistant` - General help and conversation
- ✅ `coder` - Code generation and refactoring
- ✅ `reviewer` - Code review and analysis
- ✅ `debugger` - Finding and fixing bugs
- ✅ `writer` - Content creation and editing

**Stateless Execution**: Each run is independent

- Agents don't maintain state between runs
- Use **memory** for persistence
- Each execution starts fresh

**Provider-Backed**: Agents use AI providers for intelligence

- Claude (Anthropic) - Best for reasoning and code
- Gemini (Google) - Fast and versatile
- OpenAI - For embeddings and specialized tasks

---

## Profiles

### What is a Profile?

A **profile** is a YAML file that defines an agent's configuration.

### Profile Structure

```yaml
# .automatosx/agents/assistant.yaml
name: assistant
version: 1.0.0
description: General purpose AI assistant

# Model configuration
model:
  provider: claude
  command: claude
  temperature: 0.7
  maxTokens: 4096

# System prompt defines behavior
system: |
  You are a helpful AI assistant. You provide accurate,
  concise answers. Be friendly but professional.

# Abilities the agent can use
abilities:
  - web-search
  - code-analysis
  - file-operations

# Memory configuration
memory:
  enabled: true
  contextSize: 10

# Execution settings
execution:
  timeout: 120000
  retries: 3
  stream: false
```

### Key Components

**Basic Info**:

- `name` - Unique identifier for the agent
- `version` - Profile version (for tracking changes)
- `description` - What the agent does

**Model Settings**:

- `provider` - Which AI service to use
- `name` - Specific model name
- `temperature` - Creativity (0.0-1.0)
- `maxTokens` - Response length limit

**System Prompt**:

- Defines agent's personality and behavior
- Instructions for how to respond
- Guidelines and constraints

**Abilities**:

- List of skills the agent can use
- Loaded from `.automatosx/abilities/`
- Injected into agent's context

**Memory**:

- Whether to use memory system
- How many past interactions to include
- Context window size

---

## Abilities

### What is an Ability?

An **ability** is a reusable skill that agents can use. Abilities are defined in Markdown files.

### Ability Structure

```markdown
# Web Search

Search the web for information using a search API.

## Usage

search(query: string, options?: SearchOptions): SearchResult[]

## Parameters

- `query` (string, required) - Search query
- `options.maxResults` (number, optional) - Max results (default: 10)
- `options.safeSearch` (boolean, optional) - Enable safe search (default: true)

## Returns

Array of search results with:
- `title` - Result title
- `url` - Result URL
- `snippet` - Content preview
- `relevance` - Relevance score (0-1)

## Example

```javascript
// Search for TypeScript documentation
const results = search("TypeScript documentation", {
  maxResults: 5,
  safeSearch: true
});

results.forEach(r => {
  console.log(`${r.title}: ${r.url}`);
});
```

## Error Handling

- `RateLimitError` - Too many requests
- `NetworkError` - Connection failed
- `InvalidQueryError` - Query too short or invalid

## Best Practices

1. Keep queries specific and clear
2. Limit results to what you need
3. Handle errors gracefully
4. Cache results when possible

```

### Why Abilities?

**Reusability**: Define once, use in multiple agents
```yaml
# assistant.yaml
abilities:
  - web-search
  - code-analysis

# coder.yaml
abilities:
  - code-analysis
  - file-operations
  - git-operations
```

**Modularity**: Easy to add/remove capabilities

```yaml
# Before
abilities:
  - web-search

# After - add database access
abilities:
  - web-search
  - database-query
```

**Documentation**: Built-in usage examples

- Clear API documentation
- Parameter specifications
- Error handling guidelines

---

## Memory

### What is Memory?

**Memory** is AutomatosX's persistent storage system using **SQLite + vec** for vector search.

### Memory Types

**Text Memory**: Store and retrieve by keywords

```bash
# Add a memory
automatosx memory add "TypeScript is a typed superset of JavaScript" \
  --type knowledge \
  --tags programming,typescript

# Search by text
automatosx memory list --tags typescript
```

**Vector Memory**: Semantic search using embeddings

```bash
# Search by meaning (requires OpenAI API key)
automatosx memory search "What are the benefits of static typing?"

# Returns relevant memories even if keywords don't match
# - "TypeScript is a typed superset of JavaScript"
# - "Static typing catches errors at compile time"
# - "Type systems improve code quality"
```

### Memory Structure

Each memory entry contains:

```javascript
{
  id: 1,
  content: "TypeScript is a typed superset of JavaScript",
  metadata: {
    type: "knowledge",        // conversation, code, document, task
    tags: ["programming", "typescript"],
    source: "assistant",       // which agent created it
    createdAt: "2025-10-06T...",
    accessedAt: "2025-10-06T...",
    accessCount: 5
  },
  embedding: [0.123, -0.456, ...],  // 1536-dimension vector
  similarity: 0.89  // when returned from search
}
```

### Memory in Agent Context

When an agent runs with memory enabled:

1. AutomatosX searches for relevant past interactions
2. Top N most relevant memories are loaded
3. Memories are injected into agent's context
4. Agent uses past knowledge to inform response

Example:

```yaml
# agent profile
memory:
  enabled: true
  contextSize: 10  # Include 10 most relevant memories
```

### Storage Details

- **Database**: SQLite with vec extension
- **Location**: `.automatosx/memory/memory.db`
- **Size**: ~2-5MB for 10,000 entries
- **Performance**: 0.72ms average query latency
- **Dimensions**: 1536 (OpenAI text-embedding-3-small)

---

## Providers

### What is a Provider?

A **provider** is an AI service backend that powers agents.

### Supported Providers

**Claude** (Anthropic):

- Best for: Reasoning, code generation, long context
- CLI uses latest available model automatically
- Access: Via `claude` CLI command

**Gemini** (Google):

- Best for: Fast responses, multimodal tasks
- CLI uses latest available model automatically
- Access: Via `gemini` CLI command

**Codex**:

- Best for: Planning and code generation
- CLI uses latest available model automatically
- Access: Via `codex` CLI command

### Provider Configuration

```json
{
  "providers": {
    "claude-code": {
      "enabled": true,
      "priority": 1,      // Try first
      "timeout": 120000,   // 2 minutes
      "command": "claude"
    },
    "gemini-cli": {
      "enabled": true,
      "priority": 2,      // Fallback
      "timeout": 180000,   // 3 minutes
      "command": "gemini"
    }
  }
}
```

### Provider Selection

**Automatic**: Based on priority

```bash
# Uses highest priority enabled provider
automatosx run assistant "Hello"
```

**Manual Override**: Specify provider

```bash
# Force use of Gemini
automatosx run assistant "Hello" --provider gemini
```

**Fallback**: If provider fails

```
1. Try claude-code (priority 1)
   ↓ (fails)
2. Try gemini-cli (priority 2)
   ↓ (fails)
3. Error: All providers failed
```

---

## Workspaces

### What is a Workspace?

A **workspace** is an isolated directory where an agent can write files.

### Security Model

**Read Access**: Agents can read from:

- ✅ Project root (validated paths)
- ✅ User-specified files
- ❌ System files (blocked)
- ❌ Parent directories via `../` (blocked)

**Write Access**: Agents can only write to:

- ✅ Their workspace: `.automatosx/workspaces/<agent-name>/`
- ❌ Project files (blocked)
- ❌ System files (blocked)

### Workspace Structure

```
.automatosx/workspaces/
├── assistant/           # assistant agent workspace
│   ├── scratch.txt
│   └── notes.md
├── coder/              # coder agent workspace
│   ├── generated-code.ts
│   └── refactored.ts
└── reviewer/           # reviewer agent workspace
    ├── review-notes.md
    └── issues.json
```

### Why Workspaces?

**Safety**: Prevent accidental overwrites

```bash
# Agent can't do this
rm -rf /important-files

# Agent can only do this
echo "notes" > .automatosx/workspaces/assistant/notes.txt
```

**Isolation**: Each agent has its own space

```bash
# coder writes here
.automatosx/workspaces/coder/output.ts

# reviewer writes here
.automatosx/workspaces/reviewer/review.md

# No conflicts!
```

**Cleanup**: Easy to clean up agent outputs

```bash
# Remove all agent outputs
rm -rf .automatosx/workspaces/*

# Remove specific agent
rm -rf .automatosx/workspaces/coder/
```

---

## How It All Works Together

### Example Flow

1. **User Request** (via Claude Code):

   ```
   "Can you help me refactor this code?"
   ```

2. **Claude Code Executes**:

   ```bash
   automatosx run coder "Refactor the login function for better readability"
   ```

3. **AutomatosX**:
   - Loads `coder` profile from `.automatosx/agents/coder.yaml`
   - Loads abilities: `code-analysis`, `file-operations`
   - Searches memory for relevant past code reviews
   - Creates workspace: `.automatosx/workspaces/coder/`

4. **AI Provider** (Claude):
   - Receives system prompt + abilities + memory context + user request
   - Generates refactored code
   - Writes output to workspace

5. **AutomatosX**:
   - Returns response to Claude Code
   - Saves interaction to memory
   - Logs execution details

6. **Claude Code**:
   - Displays result to user
   - User can review changes in workspace

### Data Flow

```
User → Claude Code → AutomatosX → AI Provider
                          ↓
                      Memory DB
                          ↓
                      Workspace
                          ↓
                      Logs
```

---

## Best Practices

### Agent Design

**Do**:

- ✅ Create specialized agents for specific tasks
- ✅ Write clear, detailed system prompts
- ✅ Use temperature 0.3-0.7 for focused tasks
- ✅ Enable memory for context-aware responses

**Don't**:

- ❌ Create generic "do everything" agents
- ❌ Use vague system prompts
- ❌ Set temperature too high (> 0.9) for code tasks
- ❌ Disable memory if context matters

### Ability Design

**Do**:

- ✅ Document parameters clearly
- ✅ Provide usage examples
- ✅ Include error handling
- ✅ Keep abilities focused (single responsibility)

**Don't**:

- ❌ Create overlapping abilities
- ❌ Mix multiple concerns in one ability
- ❌ Forget to document edge cases

### Memory Usage

**Do**:

- ✅ Tag memories for easy retrieval
- ✅ Use descriptive content
- ✅ Clean up old memories periodically
- ✅ Export/backup important memories

**Don't**:

- ❌ Store sensitive information
- ❌ Let memory grow unbounded
- ❌ Forget to set up OpenAI key for search

---

## Next Steps

- **Quick Start**: [Quick Start Guide](./quick-start.md)
- **Tutorials**: [Creating Your First Agent](../tutorials/first-agent.md)
- **Reference**: [CLI Commands](../reference/cli-commands.md)
- **Advanced**: [Advanced Usage](../tutorials/advanced-usage.md)

---

**Questions?** Check the [Troubleshooting Guide](../troubleshooting/common-issues.md) or [open an issue](https://github.com/defai-sg/automatosx/issues).
