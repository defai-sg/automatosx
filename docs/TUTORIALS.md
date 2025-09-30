# AutomatosX Tutorials

Welcome! This guide provides step-by-step tutorials to help you master AutomatosX, from running your first task to
making your first contribution.

## 1. Quick Start: Your First Task

This tutorial will guide you through running a simple task with the `backend` agent.

**Goal:** Have the `backend` agent design a simple API endpoint.

**Step 1: Check System Health**
Before starting, ensure AutomatosX is installed correctly.

```bash
npm run health
```
You should see a series of checks passing. If not, refer to the
**[TROUBLESHOOTING.md](TROUBLESHOOTING.md#installation--setup-issues)** guide.

**Step 2: Run the Task**
Now, let's give the `backend` agent, whose persona is "Bob", a task.

```bash
npm start run backend "Design a REST API endpoint to fetch a user by their ID"
```

**Step 3: Analyze the Output**
AutomatosX will now orchestrate the task. The output will show the agent's response, which should be a structured
design for the requested API endpoint, likely including the HTTP method, URL path, request parameters, and example
success/error responses.

Congratulations! You've successfully delegated a task to an AI agent.

## 2. Core Skills: Using the Memory System

AutomatosX agents have memory. They remember past interactions to inform future ones.

**Goal:** Search the system's memory for a specific topic.

**Step 1: Run a Few More Tasks**
Give the agents more information to remember. Try these:

```bash
npm start run frontend "Suggest a color palette for a modern web application"
npm start run security "What are the top 3 security risks for a Node.js API?"
```

**Step 2: Search the Memory**
Now, imagine you want to recall the information about API security. You can use the memory command to perform a
semantic search across all conversations.

```bash
npm start memory search "API security risks"
```

**Step 3: Review the Results**
The output will list conversation snippets from memory that are semantically related to your query, along with the
ID of the conversation. You can then view the full conversation if needed:

```bash
# Use the ID from the search results
npm start memory show <conversation-id>
```
This demonstrates how the system builds a persistent, searchable knowledge base from its interactions.

> **Learn More**: For comprehensive memory operations, see **[OPERATIONS.md](OPERATIONS.md#memory-and-context-operations)**.
> For technical details about the memory system, refer to **[ARCHITECTURE.md](ARCHITECTURE.md#memory-system)**.

## 3. First Contribution: Adding a New Ability

One of the most powerful features of AutomatosX is that an agent's knowledge (its "abilities") is stored in simple
Markdown files that you can edit.

**Goal:** Add a new technical detail to the `backend` agent's knowledge base.

**Step 1: Locate the Abilities**
The abilities for each agent are stored in `src/agents/{role}/abilities/`. Let's find the backend agent's abilities.

```bash
ls src/agents/backend/abilities/
```
You will see Markdown files such as `core-abilities.md`, `tools-and-frameworks.md`, and `processes-and-workflows.md`.

**Step 2: Edit an Ability File**
Let's add a new best practice. Open the most relevant file, for example `src/agents/backend/abilities/core-abilities.md`,
in your favorite editor.

Add a new section to the file:

```markdown
## Pagination Best Practices

When returning a list of resources, always use pagination to prevent overwhelming the server and client. The most common methods are limit/offset and cursor-based pagination. Cursor-based pagination is generally preferred for large datasets as it offers more stable performance.
```

**Step 3: Re-initialize the System**
For the agent to recognize the new knowledge, you need to re-initialize the system. This is a safe operation that
re-loads the agent profiles and abilities.

```bash
node src/scripts/dynamic-init.js full
```
Or, if using the Claude Code integration:
```
/ax:init
```

**Step 4: Test Your New Ability**
Now, ask the agent a question related to the knowledge you just added.

```bash
npm start run backend "What are the best practices for paginating an API response?"
```

The agent should now be able to answer this question accurately, incorporating the information you added directly into
its response.

You have successfully enhanced an AI agent's knowledge! This is the core workflow for customizing and improving AutomatosX.

## Next Steps

Now that you've mastered the basics, explore these areas:

- **[OPERATIONS.md](OPERATIONS.md)**: Complete command reference for daily usage
- **[CONCEPTS.md](CONCEPTS.md#three-layer-agent-architecture)**: Deep dive into the three-layer agent architecture
- **[DEVELOPMENT.md](DEVELOPMENT.md#adding-new-agents)**: Learn how to create entirely new agent types
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**: Solutions when things don't work as expected

> **Advanced Users**: See **[ARCHITECTURE.md](ARCHITECTURE.md#extension-points)** for system extension points and
> **[ROADMAP.md](ROADMAP.md)** for upcoming features.
