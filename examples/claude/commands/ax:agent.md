Run an AutomatosX agent with a specific task.

**Format**: `/ax:agent <agent-name>, <task>`

Parse the arguments by splitting on the first comma:
- Before comma: agent name (e.g., "assistant", "coder", "bob")
- After comma: task description (everything after the comma)

Execute:
```bash
automatosx run {agent-name} "{task}"
```

Examples:
- `/ax:agent assistant, explain quantum computing to me` → `automatosx run assistant "explain quantum computing to me"`
- `/ax:agent bob, i want you help me write a validation function` → `automatosx run bob "i want you help me write a validation function"`
- `/ax:agent coder, create a REST API for user management` → `automatosx run coder "create a REST API for user management"`
- `/ax:agent reviewer, review the changes in src/auth.ts` → `automatosx run reviewer "review the changes in src/auth.ts"`

Available built-in agents: assistant, coder, reviewer, debugger, writer, backend, frontend, data, security, quality

Note: You can also use custom agent names if you've created them in `.automatosx/agents/`
