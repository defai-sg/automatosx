# AutomatosX Architecture

This document describes the technical architecture and implementation details of AutomatosX.
It's designed for developers, maintainers, and AI systems that need to understand the internal workings.

## 🏗️ System Architecture Overview

AutomatosX follows a modular, CLI-first architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code CLI                         │
│                  (/ax:* commands)                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                Enhanced Router                               │
│  • Agent Selection  • Provider Routing  • Memory Integration │
└─────────┬───────────────────┬───────────────────────────────┘
          │                   │
┌─────────▼─────────┐ ┌───────▼──────────────┐
│   Agent System    │ │   Memory System      │
│ • Profiles        │ │ • Milvus Vector DB   │
│ • Abilities       │ │ • Chat History       │
│ • Personalities   │ │ • Cross-agent Memory │
└─────────┬─────────┘ └──────────────────────┘
          │
┌─────────▼─────────────────────────────────┐
│           Provider System                  │
│ • Claude Code CLI  • OpenAI CLI  • Gemini │
└───────────────────────────────────────────┘
```

## 📂 Directory Structure

### Core System Directories

```
src/
├── core/                 # Core orchestration components
│   ├── enhanced-router.js    # Main routing engine
│   ├── profile-manager.js    # YAML profile management
│   ├── agent-manager.js      # Agent lifecycle management
│   ├── chat-history.js       # Memory integration
│   └── filesystem-manager.js # File management system
├── agents/               # Agent definitions
│   ├── agent-profiles.js     # Personality layer (JavaScript)
│   └── {role}/               # Per-agent directories
│       ├── profile.yaml      # Workflow layer (YAML)
│       └── abilities/*.md    # Knowledge layer (Markdown)
├── memory/               # Memory and persistence
│   ├── milvus-embedded.js    # Vector database integration
│   ├── practical-memory-system.js # Memory coordination
│   └── write-queue-manager.js # Concurrent access management
├── providers/            # AI provider integrations
│   ├── claude-code.js        # Primary provider
│   ├── openai-cli.js         # Fallback provider
│   └── provider-manager.js   # Provider selection and health
└── scripts/              # Operational scripts
    ├── dynamic-init.js       # System initialization
    ├── factory-reset.js      # Factory reset operations
    └── upgrade-manager.js    # Version upgrade management
```

### Configuration and Runtime Directories

```
.claude/                  # Claude Code integration
├── commands/ax/          # Slash command definitions
├── mcp/ax/              # MCP server implementations
└── config.json         # Claude Code configuration

.defai/                  # AutomatosX runtime data
├── agents/              # Runtime agent instances
├── .defai/workspaces/   # Agent execution environments
├── memory/              # Local memory storage
├── backups/             # System backups
└── filesystem-map.json  # File management metadata
```

## 🔧 Core Components

### Enhanced Router (`src/core/enhanced-router.js`)

The central orchestration engine that coordinates all system components:

**Responsibilities**:
- Agent selection based on task analysis
- Provider routing with circuit breaker patterns
- Memory integration and context management
- Workflow orchestration for multi-agent tasks

**Agent Selection Logic**:
The router performs a keyword-based analysis of the user's task. It extracts key terms and matches them
against the `specializations` and `role` defined in each agent's `profile.yaml`. The agent with the highest
number of matching keywords is selected. This lightweight approach ensures fast and predictable routing
without requiring an extra LLM call for task analysis.

**Key Methods**:
- `routeTask(task, options)` - Route task to appropriate agent
- `executeWorkflow(pattern, context)` - Multi-agent workflow execution
- `getAgentContext(role, task)` - Gather relevant context for agent

### Profile Manager (`src/core/profile-manager.js`)

Manages YAML-based agent profiles and workflow definitions:

**Features**:
- Dynamic profile loading from `src/agents/{role}/profile.yaml`
- Workflow stage execution with model optimization
- Memory scope management
- Template inheritance and validation

**Profile Structure**:
```yaml
role: backend
description: "Senior Backend Engineer specializing in server-side architecture"
specializations: ["API design", "Database optimization", "Security"]
workflow_stages:
  - api_requirements_analysis
  - database_schema_design
  - service_architecture_planning
memory_scope: ["api", "database", "architecture"]
model_config:
  tier_core_technical:
    token_limit: 12000
    temperature: 0.1
```

### Memory System (`src/memory/`)

Implements dual-layer memory with vector search capabilities:

**Components**:
- **Milvus Embedded**: Vector database for semantic search
- **Practical Memory System**: High-level memory coordination
- **Write Queue Manager**: Concurrent access safety
- **Memory Server Client**: Distributed memory access

**Memory Flow**:
1. Conversation → Vector embedding → Milvus storage
2. Query → Semantic search → Relevant context retrieval
3. Cross-agent memory sharing with scope filtering

### Provider System (`src/providers/`)

Manages multiple AI provider integrations with automatic failover:

**Provider Priority**:
1. **Claude Code CLI** (Primary) - Zero-cost, CLI-authenticated
2. **Gemini CLI** (Secondary) - Google AI via gcloud
3. **OpenAI CLI** (Fallback) - Codex integration

**Circuit Breaker Pattern**:
- Health monitoring for each provider
- Automatic failover on provider failure
- Recovery detection and restoration

## 🗃️ Data Models

### Agent Profile (YAML)
```yaml
role: string                    # Unique agent identifier
description: string             # Agent description
specializations: string[]       # Areas of expertise
personality: object             # Communication traits
workflow_stages: string[]       # Multi-step execution pattern
memory_scope: string[]          # Memory context filtering
model_config: object           # Provider-specific settings
```

### Agent Personality (JavaScript)
```javascript
{
  name: "Bob",
  title: "Senior Backend Engineer",
  personality: "methodical, performance-obsessed, security-conscious",
  catchphrase: "Let's architect this properly",
  specializations: ["API design", "Database optimization"]
}
```

### Memory Record
```javascript
{
  id: string,               // Unique conversation identifier
  agentRole: string,        // Agent that handled the conversation
  content: string,          // User input
  response: string,         // Agent response
  category: string,         // Task category
  timestamp: Date,          // Creation time
  metadata: object          // Provider, model, performance data
}
```

## 🔄 Execution Flow

### Single Agent Task Execution

1. **Task Reception**: Claude Code receives `/ax:backend "create API"`
2. **Router Initialization**: Enhanced router loads and initializes
3. **Agent Selection**: Profile manager identifies backend agent
4. **Context Gathering**: Memory system retrieves relevant history
5. **Ability Loading**: Relevant abilities files are loaded
6. **Prompt Construction**: Profile manager builds enhanced prompt
7. **Provider Execution**: Provider system executes with failover
8. **Memory Storage**: Conversation stored in vector database
9. **Response Delivery**: Result returned to Claude Code

### Multi-Agent Workflow Execution

1. **Workflow Definition**: Template defines agent sequence and conditions
2. **Context Initialization**: Shared context object created
3. **Sequential Execution**: Each agent processes with context
4. **Context Passing**: Results flow to subsequent agents
5. **Conditional Logic**: Workflow adapts based on intermediate results
6. **Result Aggregation**: Final output combines all agent contributions

## 🎛️ Configuration System

### Model Templates (`src/config/model-templates.yaml`)

Defines model selection and optimization patterns:

```yaml
model_tiers:
  tier_core_technical:
    description: "Technical tasks requiring precision"
    token_limit: 12000
    temperature: 0.1
    providers:
      claude-code: "claude-3-sonnet"
      openai-cli: "gpt-4"
```

### Provider Configuration (`src/config/providers.json`)

Provider-specific settings and health monitoring:

```json
{
  "claude-code": {
    "priority": 1,
    "health_check": "claude --version",
    "timeout": 30000
  }
}
```

## 🔒 Security Model

### CLI Authentication
- **No stored credentials**: All authentication via CLI tools
- **Token management**: Providers handle their own token lifecycle
- **Permission scoping**: Limited to CLI tool capabilities

### File System Security
- **Sandboxed workspaces**: Each agent execution isolated
- **User data protection**: System files separated from user data
- **Backup verification**: All destructive operations create backups

### Memory Security
- **Scoped access**: Agents only access relevant memory scopes
- **No credential storage**: Memory excludes sensitive information
- **Vector embeddings**: Raw content not directly accessible

## 🔧 Extension Points

### Adding New Agents

1. **Create Profile**: `src/agents/{role}/profile.yaml`
2. **Add Abilities**: `src/agents/{role}/abilities/*.md`
3. **Register Personality**: Update `src/agents/agent-profiles.js`
4. **Run Dynamic Init**: `node src/scripts/dynamic-init.js full`

### Adding New Providers

1. **Implement Interface**: Follow `src/providers/claude-code.js` pattern
2. **Add Configuration**: Update `src/config/providers.json`
3. **Register Provider**: Update `src/providers/provider-manager.js`
4. **Test Integration**: Validate with circuit breaker system

### Extending Memory System

1. **Implement Storage Backend**: Follow `src/memory/milvus-embedded.js`
2. **Update Memory Manager**: Integrate with `practical-memory-system.js`
3. **Configure Fallback**: Ensure graceful degradation
4. **Test Concurrency**: Validate with write queue manager

## 🧪 Testing Architecture

### Test Organization
```
src/__tests__/
├── integration-examples/     # System integration tests
├── concurrent-memory-test.js # Memory system stress testing
├── enhanced-system-test.js   # End-to-end validation
└── practical-memory-test.js  # Memory functionality testing
```

### Test Strategy
- **Integration Tests**: Validate component interactions
- **Memory Tests**: Concurrent access and performance
- **Provider Tests**: Failover and circuit breaker logic
- **Filesystem Tests**: Safe operations and backup systems

## 📊 Performance Considerations

### Memory System Optimization
- **Vector embedding caching**: Reduce computation overhead
- **Concurrent write queuing**: Prevent database conflicts
- **Memory scope filtering**: Limit context size
- **Graceful degradation**: Function without vector database

### Provider Circuit Breaker
- **Health monitoring**: Regular provider availability checks
- **Exponential backoff**: Intelligent retry patterns
- **Load balancing**: Distribute requests across healthy providers
- **Performance metrics**: Track response times and success rates

### Filesystem Management
- **Lazy loading**: Load agent profiles on demand
- **File watching**: Detect configuration changes
- **Backup optimization**: Incremental backup strategies
- **Cache management**: Intelligent file caching

This architecture enables AutomatosX to provide robust, scalable AI agent orchestration while maintaining
simplicity and extensibility.

## Related Documentation

**For Practical Usage**:
- **[TUTORIALS.md](TUTORIALS.md)**: Step-by-step learning guide
- **[OPERATIONS.md](OPERATIONS.md)**: Complete command reference

**For Understanding**:
- **[CONCEPTS.md](CONCEPTS.md)**: Core concepts behind this architecture
- **[PROJECT-HISTORY.md](PROJECT-HISTORY.md)**: Why these architectural decisions were made

**For Extension**:
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: How to extend this architecture
- **[ROADMAP.md](ROADMAP.md)**: Planned architectural enhancements
