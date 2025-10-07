Search AutomatosX memory for relevant information.

Parse the argument as a search query.

Execute:
```bash
automatosx memory search "{query}"
```

This will search through stored memories and return relevant results.

Examples:
- `/ax:memory authentication` → `automatosx memory search "authentication"`
- `/ax:memory how to setup database` → `automatosx memory search "how to setup database"`
- `/ax:memory API errors` → `automatosx memory search "API errors"`

Options:
- Add `--limit <n>` to limit results (default: 10)
- Add `--type <type>` to filter by memory type

Example with options:
- `/ax:memory authentication --limit 5` → Search with limit
