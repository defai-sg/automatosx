# AutomatosX Agent Executor

Execute an AutomatosX agent with a specific task.

## Usage

```
/ax <agent-name> <task>
```

## Examples

```
/ax assistant "Explain quantum computing in simple terms"
/ax coder "Write a function to validate email addresses"
/ax reviewer "Review the changes in src/auth.ts"
/ax debugger "Why is the login form not submitting?"
```

## Available Agents

- **assistant** - General purpose helper
- **coder** - Code generation specialist
- **reviewer** - Code review expert
- **debugger** - Debug assistance
- **writer** - Content creation
- **backend** - Backend development
- **frontend** - Frontend development
- **data** - Data analysis
- **security** - Security auditing
- **quality** - Quality assurance

## How it Works

This command executes the AutomatosX CLI and returns the agent's response:

```bash
automatosx run {agent-name} "{task}"
```

The agent will:
1. Load its profile and abilities
2. Access relevant memory (if enabled)
3. Execute the task using configured AI provider
4. Save the interaction to memory (if enabled)
5. Return the response

## Configuration

Agents are configured in `.automatosx/agents/` directory. You can:
- Customize existing agents
- Create new agents
- Modify abilities in `.automatosx/abilities/`

Run `automatosx init` to set up the project structure.
