# AutomatosX Core Concepts

This document explains the fundamental concepts and mental models behind AutomatosX.
Understanding these concepts is essential for both AI systems and humans to work effectively with the platform.

## 🎯 Core Purpose

**AutomatosX transforms general AI capabilities into specialized professional roles.**

Instead of a single general AI assistant, AutomatosX provides 20 specialized AI agents,
each with distinct expertise, personality, and workflow patterns - like having a complete software development team.

## 🏗️ Three-Layer Agent Architecture

AutomatosX agents are built using a three-layer architecture that separates different types of information:

### Layer 1: YAML Profiles (`src/agents/{role}/profile.yaml`)
**Purpose**: Workflow and execution patterns
**Contains**:
- Multi-stage workflow definitions
- Model selection and token limits
- Memory scope and context management
- Performance optimization settings

**Example**: The backend agent has 7 workflow stages from analysis to monitoring.

> **Implementation Details**: See **[ARCHITECTURE.md](ARCHITECTURE.md#profile-manager)** for technical details.

### Layer 2: Markdown Abilities (`src/agents/{role}/abilities/*.md`)
**Purpose**: Knowledge and expertise
**Contains**:
- Technical knowledge and best practices
- Framework and tool expertise
- Domain-specific methodologies
- User-editable content

**Example**: Backend abilities include API design patterns, database optimization, security practices.

### Layer 3: JavaScript Personalities (`src/agents/agent-profiles.js`)
**Purpose**: Communication and decision-making patterns
**Contains**:
- Human names and titles (Bob the Backend Engineer)
- Communication styles and catchphrases
- Decision-making approaches
- Personality traits

## 🧠 Memory and Knowledge System

AutomatosX implements a dual memory system:

### Static Knowledge (Abilities)
- **User-editable**: Markdown files that can be customized
- **Role-specific**: Each agent has its own knowledge base
- **Versioned**: Tracked in git, can be backed up
- **Purpose**: Domain expertise and best practices

### Dynamic Memory (Chat History)
- **Automatic**: Managed by Milvus vector database
- **Cross-agent**: Agents can learn from each other's conversations
- **Semantic**: Uses vector embeddings for intelligent retrieval
- **Purpose**: Learning from experience and context

## 🔄 Agent Workflow Patterns

Each agent follows a structured workflow pattern:

1. **Task Analysis**: Understanding the request
2. **Context Gathering**: Retrieving relevant abilities and memory
3. **Execution Planning**: Breaking down the task
4. **Implementation**: Performing the work
5. **Validation**: Checking results
6. **Documentation**: Recording outcomes

This pattern ensures consistent, professional results across all agent types.

> **Practical Guide**: Learn how to work with workflows hands-on in **[TUTORIALS.md](TUTORIALS.md#your-first-task)**
> and see all available workflow commands in **[OPERATIONS.md](OPERATIONS.md#workflow-operations)**.

## 🎭 Agent Specializations

AutomatosX provides agents for different software development roles:

### Development Roles
- **Backend** (Bob): Server-side, APIs, databases
- **Frontend** (Frank): UI/UX, client-side development
- **DevOps** (Oliver): Infrastructure, deployment, monitoring
- **Security** (Steve): Security analysis, vulnerability assessment
- **Quality** (Queenie): Testing, QA, validation

### Strategic Roles
- **Architect** (Aki): System design, technical strategy
- **Data** (Diana): Data science, analytics, ML
- **Product** (Paris): Product management, requirements
- **CEO** (Eric): Strategic decisions, resource allocation

### Specialized Roles
- **Algorithm**, **Edge**, **Network**, **Quantum**: Specialized technical domains
- **Legal**, **Marketer**, **CFO**: Business support roles

## 🔧 Provider Integration and CLI-First Evolution

AutomatosX evolved to a CLI-first approach after learning from early V3.0
development challenges.

### Early V3.0 API Key Challenges
During the initial V3.0 development phase, AutomatosX attempted direct API key integration but encountered
several critical issues:

**Technical Problems**:
- **Model versioning chaos**: AI models constantly change names and parameters
- **Breaking API changes**: Frequent updates disrupted existing integrations
- **Parameter compatibility**: Different models require different parameter sets
- **Authentication complexity**: Managing multiple API keys across providers

**Market Reality Assessment**:
- **User preference**: Most users prefer cost-ceiling plans (Claude Pro/Max) over pay-per-API usage
- **Team economics**: API costs scale poorly for development teams
- **Industry shift**: CTO analysis shows AI coding tools will enable smaller, more agile teams
- **Cost predictability**: Fixed monthly costs vs. unpredictable API charges

### CLI-First Solution
Based on these insights, AutomatosX pivoted to CLI-only integration:

### Primary Provider: Claude Code CLI
- **Zero-cost access**: Uses CLI authentication exclusively
- **Native integration**: Direct slash commands and MCP servers
- **Cost predictability**: Leverages existing subscription plans
- **Version stability**: CLI handles model updates transparently

### Provider System
- **Claude Code CLI**: Primary provider (zero-cost, official Anthropic CLI via `claude` command)
- **Gemini CLI**: Secondary provider (Google AI integration via `gemini` command)
- **Codex CLI**: Fallback provider (OpenAI Codex integration via `codex` command)
- **Circuit Breaker**: Automatic failover between CLI providers

### Model Management Philosophy

**AutomatosX uses CLI default models rather than specific model selection.**

**Why this approach?**
- **Reduced Maintenance**: AI providers frequently change model names (claude-3-sonnet → claude-3-5-sonnet → claude-4-sonnet)
- **Automatic Updates**: Each CLI automatically uses the latest/best available model for the provider
- **Zero Configuration**: No need to track or update model names across three different providers
- **Fewer Bugs**: Eliminates errors from outdated model configurations
- **Provider Expertise**: Let each provider choose their optimal default model

**Implementation**:
- `claude` → Uses Anthropic's recommended default model
- `gemini` → Uses Google's recommended default model
- `codex` → Uses OpenAI's recommended default model

This "hands-off" approach reduces system complexity while ensuring access to the latest AI capabilities.

### Benefits of CLI-First Approach
- **No API key management**: Zero stored credentials security model
- **Cost efficiency**: Works with existing subscription plans
- **Version resilience**: CLI tools handle model updates
- **Team scalability**: Supports small, agile development teams

## 📁 Filesystem Management

AutomatosX includes comprehensive filesystem management:

### File Categories
- **System Core**: Core platform files (upgradable)
- **User Data**: Workspaces, memory, configurations (preserved)
- **Runtime Generated**: Temporary files (regenerable)
- **Claude Integration**: Commands and MCP servers (backed up)

### Operations
- **Factory Reset**: Clean system state while preserving user data
- **Safe Upgrades**: Version migration with automatic backup
- **Filesystem Mapping**: Central tracking of all files

## 🔀 Multi-Agent Workflows

AutomatosX supports complex workflows involving multiple agents:

### Workflow Patterns
- **Security Fix**: Security → Backend → Quality
- **Feature Development**: Product → Architect → Backend + Frontend → Quality
- **Code Review**: Backend → Security → Quality

### Workflow Features
- **Template-based**: Reusable workflow definitions
- **Conditional execution**: Steps based on previous results
- **Context passing**: Information flows between agents
- **Result aggregation**: Combined outputs from multiple agents

## 🎨 Design Principles

AutomatosX is built on several key design principles:

### CLI-First Architecture
- **No stored credentials**: Uses CLI authentication exclusively (learned from V3.0 API key challenges)
- **Command-line native**: Built for developer workflows
- **Cost-effective**: Leverages existing subscription plans instead of API usage
- **Claude Code integration**: Native slash command support

### Memory Persistence
- **Cross-session**: Memory persists between sessions
- **Cross-agent**: Agents share knowledge appropriately
- **Semantic search**: Intelligent context retrieval
- **Graceful degradation**: Works without vector database

### User Data Protection
- **Never destructive**: User data is always preserved
- **Automatic backups**: Before any risky operation
- **Clear separation**: System vs user file distinction
- **Recovery mechanisms**: Multiple restoration options

## 🔄 Mental Model for AI Systems

For AI systems working with AutomatosX:

1. **Think of agents as specialized colleagues** rather than tools
2. **Each agent has expertise domains** - use the right agent for the task
3. **Agents have memory** - they learn from previous interactions
4. **Workflows can involve multiple agents** - complex tasks benefit from collaboration
5. **The system is self-managing** - filesystem operations are safe and documented

## 🎯 Key Benefits

### For Users
- **Specialized expertise**: Right agent for every task
- **Consistent workflows**: Professional patterns every time
- **Memory continuity**: Agents remember and learn
- **Safe operations**: Data protection built-in

### For AI Systems
- **Clear role definitions**: Unambiguous specializations
- **Structured knowledge**: Organized information access
- **Memory integration**: Context from previous work
- **Operational safety**: Filesystem management prevents errors

### For Developers
- **Modular architecture**: Easy to extend and maintain
- **Clear separation of concerns**: Profiles, abilities, personalities
- **Comprehensive testing**: Integration tests validate functionality
- **Documentation-driven**: Both AI and human accessible

This conceptual foundation enables AutomatosX to provide professional-grade AI agent
orchestration while maintaining simplicity and safety.

For future development plans and strategic vision, see [ROADMAP.md](ROADMAP.md).
