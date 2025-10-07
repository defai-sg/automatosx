Clear AutomatosX memory.

Execute:
```bash
automatosx memory clear --confirm
```

This will delete all stored memories from the AutomatosX memory database.

Options:
- Add `--type <type>` to clear specific memory type
- Add `--older-than <days>` to clear old memories only

Examples:
- `/ax:clear` → Clear all memories
- `/ax:clear --type task` → Clear only task memories
- `/ax:clear --older-than 30` → Clear memories older than 30 days

⚠️ Warning: This action cannot be undone. Consider using `/ax:memory export` first to backup.
