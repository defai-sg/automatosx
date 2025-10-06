# Tutorial: Working with Memory

Learn how to use AutomatosX's memory system for context-aware AI agents.

---

## What You'll Learn

- How the memory system works (SQLite + vec)
- Adding and managing memories
- Searching with vector embeddings
- Using memory in agent profiles
- Best practices for memory management

**Time Required**: 20-25 minutes

---

## Prerequisites

- AutomatosX installed and initialized
- OpenAI API key (for vector search)
- Basic understanding of vector embeddings (helpful but not required)

---

## Understanding AutomatosX Memory

### What is Memory?

AutomatosX uses **SQLite with vec extension** for hybrid search:
- **Text Search**: Keyword-based lookup (tags, type)
- **Vector Search**: Semantic similarity search using embeddings

### Why Memory?

**Context Awareness**: Agents remember past interactions
```bash
# First run
automatosx run assistant "What is TypeScript?"

# Later run (with memory)
automatosx run assistant "What are its benefits?" --memory
# Agent remembers previous TypeScript discussion
```

**Knowledge Persistence**: Build up domain knowledge over time
```bash
# Add project-specific knowledge
automatosx memory add "Our API uses JWT with 24h expiry" --type knowledge --tags api,auth

# Agent uses this in code reviews
automatosx run code-reviewer "Review auth.ts" --memory
# Agent applies your specific JWT standards
```

### Memory Architecture

```
Memory System
├── Storage: SQLite database (.automatosx/memory/memory.db)
├── Vector Index: HNSW algorithm (sqlite-vec)
├── Embeddings: OpenAI text-embedding-3-small (1536 dimensions)
└── Performance: ~0.72ms average query latency
```

---

## Step 1: Setup

### Install AutomatosX

```bash
npm install -g automatosx
automatosx init
```

### Configure OpenAI API Key

For vector search, you need an OpenAI API key:

```bash
# Set environment variable
export OPENAI_API_KEY="sk-..."

# Or add to your shell profile
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.zshrc
source ~/.zshrc
```

**Note**: Vector search requires OpenAI embeddings. Text-based operations (tags, type) work without it.

---

## Step 2: Adding Memories

### Basic Usage

```bash
automatosx memory add "TypeScript is a typed superset of JavaScript"
```

### With Metadata

```bash
automatosx memory add "TypeScript is a typed superset of JavaScript" \
  --type knowledge \
  --tags programming,typescript,javascript
```

### Memory Types

AutomatosX supports 4 memory types:

| Type | Purpose | Example |
|------|---------|---------|
| `knowledge` | Facts, definitions, concepts | "React uses virtual DOM" |
| `conversation` | Past interactions | "User prefers functional style" |
| `code` | Code snippets, patterns | "Auth: JWT with 24h expiry" |
| `task` | Completed tasks, decisions | "Migrated to TypeScript in v2.0" |

### Examples by Type

**Knowledge**:
```bash
automatosx memory add "SOLID principles: Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion" \
  --type knowledge \
  --tags programming,solid,design-patterns
```

**Conversation**:
```bash
automatosx memory add "User prefers arrow functions over function declarations" \
  --type conversation \
  --tags preferences,code-style
```

**Code**:
```bash
automatosx memory add "API error handling: try-catch with custom AppError class extending Error" \
  --type code \
  --tags error-handling,api,patterns
```

**Task**:
```bash
automatosx memory add "Migrated authentication from sessions to JWT (2025-10-01)" \
  --type task \
  --tags auth,migration,completed
```

---

## Step 3: Searching Memories

### Text Search (Tag-based)

```bash
# Search by tag
automatosx memory list --tags typescript

# Multiple tags (AND logic)
automatosx memory list --tags programming,typescript

# By type
automatosx memory list --type knowledge

# By type and tags
automatosx memory list --type code --tags error-handling
```

### Vector Search (Semantic)

```bash
# Semantic search (requires OpenAI API key)
automatosx memory search "What are the benefits of static typing?"
```

**How it works**:
1. Your query is converted to a 1536-dimension vector
2. Similarity search finds related memories
3. Results ranked by relevance (cosine similarity)

**Example**:
```bash
automatosx memory search "error handling best practices"
```

Output:
```
Found 3 memories (similarity > 0.75):

1. [0.89] API error handling: try-catch with custom AppError class
   Type: code | Tags: error-handling, api
   Added: 2025-10-05

2. [0.82] Always validate input before processing to prevent errors
   Type: knowledge | Tags: validation, security
   Added: 2025-10-04

3. [0.78] User prefers detailed error messages over generic ones
   Type: conversation | Tags: preferences, errors
   Added: 2025-10-03
```

---

## Step 4: Managing Memories

### List All Memories

```bash
automatosx memory list
```

Output:
```
Total Memories: 15

┌────┬──────────────────────────────┬─────────────┬──────────────┬────────────┐
│ ID │ Content                      │ Type        │ Tags         │ Created    │
├────┼──────────────────────────────┼─────────────┼──────────────┼────────────┤
│ 1  │ TypeScript is a typed...     │ knowledge   │ programming  │ 2025-10-05 │
│ 2  │ React uses virtual DOM       │ knowledge   │ react,js     │ 2025-10-05 │
│ 3  │ User prefers arrow funcs     │ conversation│ preferences  │ 2025-10-04 │
└────┴──────────────────────────────┴─────────────┴──────────────┴────────────┘
```

### Get Memory Details

```bash
automatosx memory get 1
```

Output:
```json
{
  "id": 1,
  "content": "TypeScript is a typed superset of JavaScript",
  "metadata": {
    "type": "knowledge",
    "tags": ["programming", "typescript", "javascript"],
    "source": "user",
    "createdAt": "2025-10-05T10:30:00Z",
    "accessedAt": "2025-10-05T14:20:00Z",
    "accessCount": 5
  },
  "embedding": [0.123, -0.456, ...],  // 1536 dimensions
  "similarity": 0.95  // if from search
}
```

### Delete Memories

```bash
# Delete by ID
automatosx memory delete 1

# Delete by tag
automatosx memory delete --tags old,deprecated

# Delete by type
automatosx memory delete --type conversation

# Delete all (with confirmation)
automatosx memory delete --all
```

---

## Step 5: Import/Export

### Export Memories

```bash
# Export all
automatosx memory export memories.json

# Export specific type
automatosx memory export knowledge.json --type knowledge

# Export by tags
automatosx memory export api-docs.json --tags api,documentation
```

**Export Format** (JSON):
```json
{
  "version": "4.0.0",
  "exportedAt": "2025-10-05T15:00:00Z",
  "count": 15,
  "memories": [
    {
      "content": "TypeScript is a typed superset of JavaScript",
      "metadata": {
        "type": "knowledge",
        "tags": ["programming", "typescript"],
        "source": "user",
        "createdAt": "2025-10-05T10:30:00Z"
      }
    }
  ]
}
```

### Import Memories

```bash
# Import from file
automatosx memory import memories.json

# Import with tag override
automatosx memory import external.json --tags imported,external

# Merge mode (skip duplicates)
automatosx memory import backup.json --merge
```

---

## Step 6: Using Memory in Agents

### Enable Memory in Profile

Edit `.automatosx/agents/your-agent.yaml`:

```yaml
name: your-agent
# ... other config ...

memory:
  enabled: true
  contextSize: 10  # Include 10 most relevant memories
```

### How It Works

When you run an agent with memory:

1. **Query Generation**: Agent task is converted to embedding
2. **Memory Search**: Top N relevant memories are retrieved
3. **Context Injection**: Memories are added to agent's context
4. **Execution**: Agent uses past knowledge to inform response

**Example**:
```bash
# Without memory
automatosx run assistant "What's our auth strategy?"
# Response: "I don't have information about your specific auth strategy"

# With memory (after adding memories)
automatosx memory add "We use JWT authentication with 24h expiry" --type knowledge --tags auth
automatosx run assistant "What's our auth strategy?" --memory
# Response: "Your authentication uses JWT tokens with 24-hour expiry..."
```

### Memory-Aware Agent Example

```yaml
name: project-expert
description: Expert on this specific project

model:
  provider: claude
  name: claude-3-5-sonnet-20241022
  temperature: 0.5
  maxTokens: 8192

system: |
  You are an expert on this specific codebase.

  Use your memory to:
  - Recall past decisions and their rationale
  - Remember project-specific patterns and conventions
  - Maintain consistency with previous recommendations
  - Learn from past mistakes and improvements

  When answering:
  1. Check memory for relevant context
  2. Reference specific past interactions when helpful
  3. Update recommendations based on new learnings

memory:
  enabled: true
  contextSize: 15  # More context for better recall
```

---

## Step 7: Advanced Memory Patterns

### Pattern 1: Project Knowledge Base

Build a knowledge base about your project:

```bash
# Architecture decisions
automatosx memory add "We use microservices with event-driven architecture" \
  --type knowledge --tags architecture,design

# Tech stack
automatosx memory add "Backend: Node.js + TypeScript + PostgreSQL" \
  --type knowledge --tags stack,backend

automatosx memory add "Frontend: React + TypeScript + Tailwind CSS" \
  --type knowledge --tags stack,frontend

# Coding standards
automatosx memory add "We use functional programming style, prefer immutability" \
  --type knowledge --tags standards,code-style

# API conventions
automatosx memory add "REST API follows JSON:API spec, versioned via URL" \
  --type knowledge --tags api,conventions
```

Now agents can answer project-specific questions:
```bash
automatosx run assistant "What's our backend stack?" --memory
# Response: "Your backend uses Node.js with TypeScript and PostgreSQL..."
```

### Pattern 2: Learning from Code Reviews

Save review feedback as memories:

```bash
# After code review
automatosx memory add "Prefer Promise.all over sequential awaits for parallel operations" \
  --type knowledge --tags performance,async,patterns

automatosx memory add "Always use zod for API input validation" \
  --type knowledge --tags validation,api,libraries

# Future reviews use these standards
automatosx run code-reviewer "Review api.ts" --memory
# Agent applies learned standards
```

### Pattern 3: Conversation Context

Maintain conversation history:

```bash
# User preferences
automatosx memory add "User prefers detailed explanations with examples" \
  --type conversation --tags preferences,communication

automatosx memory add "User's team uses GitFlow branching strategy" \
  --type conversation --tags git,workflow

# Past discussions
automatosx memory add "Discussed migrating to Vite from Webpack (2025-10-01)" \
  --type conversation --tags tools,migration,vite
```

### Pattern 4: Task History

Track completed work:

```bash
# Completed tasks
automatosx memory add "Implemented rate limiting using Redis (2025-10-01)" \
  --type task --tags api,security,redis,completed

automatosx memory add "Refactored auth module to use dependency injection (2025-09-28)" \
  --type task --tags refactoring,auth,completed

# Decisions made
automatosx memory add "Decided to use Prisma ORM over TypeORM for better TS support" \
  --type task --tags decisions,orm,prisma
```

Benefits:
- Avoid duplicate work
- Remember why decisions were made
- Track project evolution

---

## Step 8: Memory Search Optimization

### Similarity Thresholds

Adjust search sensitivity:

```bash
# Strict (high similarity required)
automatosx memory search "error handling" --threshold 0.85

# Moderate (default)
automatosx memory search "error handling" --threshold 0.75

# Relaxed (broader results)
automatosx memory search "error handling" --threshold 0.60
```

### Result Limits

Control number of results:

```bash
# Top 5 results
automatosx memory search "authentication" --limit 5

# Top 20 results
automatosx memory search "authentication" --limit 20
```

### Combined Filters

```bash
# Search with type and tag filters
automatosx memory search "API design" \
  --type knowledge \
  --tags api,design \
  --threshold 0.80 \
  --limit 10
```

---

## Step 9: Memory Maintenance

### Regular Cleanup

Remove outdated memories:

```bash
# Delete old conversation memories (keep knowledge)
automatosx memory delete --type conversation --older-than 30d

# Delete by tag
automatosx memory delete --tags deprecated,old

# Archive before deleting
automatosx memory export archive-2025-10.json --type conversation
automatosx memory delete --type conversation
```

### Monitor Memory Usage

```bash
# Check memory stats
automatosx status

# Output includes:
# Memory Statistics:
#   Total Entries: 1,250
#   Database Size: 3.2 MB
#   Average Query: 0.68ms
#   Types: knowledge(450), conversation(380), code(320), task(100)
```

### Backup and Restore

```bash
# Regular backups
automatosx memory export backup-$(date +%Y%m%d).json

# Restore from backup
automatosx memory import backup-20251005.json --merge
```

---

## Step 10: Best Practices

### ✅ Do's

**1. Use Descriptive Content**:
```bash
# Good
automatosx memory add "API uses JWT with RS256 algorithm, 24h access token, 7d refresh token" \
  --type knowledge --tags api,auth,jwt

# Bad
automatosx memory add "JWT stuff" --type knowledge
```

**2. Tag Consistently**:
```bash
# Create a tagging convention
# Format: <category>/<subcategory>
automatosx memory add "..." --tags backend/api,security/auth,tech/jwt
```

**3. Regular Exports**:
```bash
# Weekly backups
automatosx memory export backups/weekly-$(date +%Y%m%d).json
```

**4. Clean Up Old Conversations**:
```bash
# Monthly cleanup
automatosx memory delete --type conversation --older-than 30d
```

**5. Use Appropriate Types**:
- `knowledge`: Facts, reusable information
- `conversation`: User preferences, discussion context
- `code`: Patterns, snippets, examples
- `task`: Completed work, decisions

### ❌ Don'ts

**1. Don't Store Sensitive Data**:
```bash
# Bad - Never do this
automatosx memory add "Production DB password: abc123" --type knowledge

# Good - Store references only
automatosx memory add "Production DB credentials in 1Password vault" --type knowledge
```

**2. Don't Let Memory Grow Unbounded**:
```bash
# Set up regular cleanup
# Keep knowledge and code, clean conversations
automatosx memory delete --type conversation --older-than 30d
```

**3. Don't Use Vague Tags**:
```bash
# Bad
--tags stuff,things,code

# Good
--tags backend/api,patterns/error-handling,tech/typescript
```

**4. Don't Forget to Set OpenAI Key**:
```bash
# Vector search requires embeddings
export OPENAI_API_KEY="sk-..."
```

---

## Real-World Example

### Scenario: Code Review Memory

**Setup**:
```bash
# Add coding standards
automatosx memory add "Always use async/await over .then() chains" \
  --type knowledge --tags standards,async

automatosx memory add "Prefer dependency injection over direct imports" \
  --type knowledge --tags standards,architecture

automatosx memory add "Use zod for all API input validation" \
  --type knowledge --tags standards,validation

# Add past decisions
automatosx memory add "Decided to use Prisma ORM (2025-09-15)" \
  --type task --tags decisions,orm

# Add team preferences
automatosx memory add "Team prefers functional style over OOP" \
  --type conversation --tags preferences,code-style
```

**Usage**:
```yaml
# .automatosx/agents/code-reviewer.yaml
name: code-reviewer
description: Code reviewer with team standards

memory:
  enabled: true
  contextSize: 10

system: |
  You are a code reviewer for this team.

  Use your memory to:
  - Apply team coding standards
  - Remember past decisions and their context
  - Maintain consistency with previous reviews
  - Learn from accepted/rejected suggestions

  Always explain WHY each standard matters.
```

**Result**:
```bash
automatosx run code-reviewer "Review this auth code" --memory

# Agent output:
# 1. ✅ Good: Using async/await (matches team standard)
# 2. ❌ Issue: Direct import of UserService (violates DI standard)
# 3. ❌ Issue: No input validation (team uses zod)
# 4. 💡 Suggestion: Align with Prisma patterns (team decision)
```

---

## Troubleshooting

### Vector Search Not Working

```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Test with text search instead
automatosx memory list --tags typescript

# Or use mock provider for testing
export AUTOMATOSX_MOCK_PROVIDERS=true
automatosx memory search "test query"
```

### Memory Not Being Used by Agent

```bash
# Check agent profile
cat .automatosx/agents/your-agent.yaml | grep -A 2 "memory:"

# Should show:
# memory:
#   enabled: true
#   contextSize: 10

# Try explicit --memory flag
automatosx run your-agent "task" --memory
```

### Database Issues

```bash
# Check database exists
ls -lh .automatosx/memory/memory.db

# Check stats
automatosx status

# Rebuild index (if corrupted)
automatosx memory rebuild-index
```

---

## Summary

You've learned to:
- ✅ Add memories with metadata (type, tags)
- ✅ Search with text (tags) and vectors (semantic)
- ✅ Import/export memories for backup
- ✅ Enable memory in agent profiles
- ✅ Use advanced memory patterns
- ✅ Maintain and optimize memory storage
- ✅ Apply best practices

**Your agents now have long-term memory!**

---

## Next Steps

- [Creating Custom Abilities](./custom-abilities.md) - Build reusable skills
- [Advanced Usage](./advanced-usage.md) - Multi-provider, optimization
- [Claude Code Integration](../guide/claude-code-integration.md) - Use in Claude Code
- [Troubleshooting](../troubleshooting/common-issues.md) - Solve common problems

---

**Questions?** Check the [FAQ](../troubleshooting/faq.md) or [open an issue](https://github.com/automatosx/automatosx/issues).
