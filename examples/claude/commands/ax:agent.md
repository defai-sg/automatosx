Run an AutomatosX agent with a specific task.

Parse the arguments as:
- First word: agent name (e.g., "assistant", "coder", "reviewer")
- Remaining text: task description

Execute:
```bash
automatosx run {agent-name} "{task}"
```

Examples:
- `/ax:agent assistant Explain quantum computing` → `automatosx run assistant "Explain quantum computing"`
- `/ax:agent coder Write a function to validate emails` → `automatosx run coder "Write a function to validate emails"`
- `/ax:agent reviewer Review the changes in src/auth.ts` → `automatosx run reviewer "Review the changes in src/auth.ts"`

Available agents: assistant, coder, reviewer, debugger, writer, backend, frontend, data, security, quality
