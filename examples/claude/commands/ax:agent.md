Execute an AutomatosX agent with a specific task.

**IMPORTANT**: When user types `/ax:agent <agent>, <task>`, you MUST:

1. Split the input on the FIRST comma
2. Extract agent name (text before comma, trimmed)
3. Extract task (text after comma, trimmed)
4. Execute: `automatosx run <agent> "<task>"`

**Parsing Rules**:
```
Input: /ax:agent assistant, explain quantum computing
↓
Agent: "assistant"
Task: "explain quantum computing"
↓
Execute: automatosx run assistant "explain quantum computing"
```

**Examples**:

User input: `/ax:agent bob, i want you help me write a validation function`
→ Execute: `automatosx run bob "i want you help me write a validation function"`

User input: `/ax:agent assistant, explain quantum computing to me`
→ Execute: `automatosx run assistant "explain quantum computing to me"`

User input: `/ax:agent coder, create a REST API for user management`
→ Execute: `automatosx run coder "create a REST API for user management"`

User input: `/ax:agent reviewer, review the changes in src/auth.ts and suggest improvements`
→ Execute: `automatosx run reviewer "review the changes in src/auth.ts and suggest improvements"`

**Available built-in agents**: assistant, coder, reviewer, debugger, writer, backend, frontend, data, security, quality

**Note**: Users can also use custom agent names if they've created them in `.automatosx/agents/`
