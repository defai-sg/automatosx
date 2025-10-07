# Our Code Review Checklist - AutomatosX v4

> Code review checklist for AutomatosX team

## Before Submitting PR

### Code Quality

- [ ] **No `any` types** - All types explicit, use `unknown` if truly unknown
- [ ] **ESM imports** - All imports have `.js` extension
- [ ] **Function size** - Functions <50 lines, extract helpers if needed
- [ ] **Naming** - Clear, descriptive names (no abbreviations)
- [ ] **Comments** - JSDoc for public APIs, inline for complex logic

### Error Handling

- [ ] **Custom errors** - Use AgentValidationError, PathError, etc. from `utils/errors.ts`
- [ ] **Error context** - Include relevant context in error messages
- [ ] **Try-catch blocks** - Catch and re-throw with context where appropriate
- [ ] **No silent failures** - All errors logged or thrown

### Security

- [ ] **Path validation** - All file access through PathResolver
- [ ] **Input sanitization** - User inputs sanitized before use
- [ ] **Workspace isolation** - Writes only to agent workspace
- [ ] **File size limits** - Check file sizes to prevent DoS
- [ ] **No hardcoded secrets** - Use environment variables

### Testing

- [ ] **Tests added** - New features have tests (unit + integration)
- [ ] **Coverage maintained** - Overall coverage ≥70%, core modules ≥85%
- [ ] **Tests pass** - All 841 tests passing
- [ ] **Edge cases** - Test edge cases and error scenarios

### Performance

- [ ] **No obvious bottlenecks** - Profile if adding expensive operations
- [ ] **Lazy loading** - Heavy deps use dynamic import
- [ ] **Caching** - Use TTLCache for expensive operations
- [ ] **Bundle size** - Check `dist/index.js` stays <250KB

### Logging

- [ ] **Structured logging** - Use `logger.info/warn/error` with context
- [ ] **Log levels** - Appropriate log levels (debug/info/warn/error)
- [ ] **No console.log** - Use logger, not console.log

### Git

- [ ] **Conventional commits** - Format: `type(scope): message`
- [ ] **Descriptive message** - Clear what and why
- [ ] **No large files** - No binaries or large files committed
- [ ] **No sensitive data** - No API keys, passwords, etc.

## Reviewer Checklist

### Code Review

- [ ] **Logic correctness** - Does the code do what it's supposed to?
- [ ] **Type safety** - Are all types correct and complete?
- [ ] **Error handling** - Are errors handled appropriately?
- [ ] **Security** - No security vulnerabilities introduced?

### Architecture

- [ ] **Import hierarchy** - Follows layer architecture (types → utils → core → agents → cli)
- [ ] **Module boundaries** - No circular dependencies
- [ ] **Separation of concerns** - Each module has single responsibility

### Testing

- [ ] **Test quality** - Tests are meaningful and comprehensive
- [ ] **Test coverage** - Coverage meets targets
- [ ] **Mock providers** - Tests use AUTOMATOSX_MOCK_PROVIDERS=true

### Documentation

- [ ] **JSDoc complete** - Public APIs have JSDoc
- [ ] **README updated** - If adding features, update README
- [ ] **CHANGELOG updated** - Add entry to CHANGELOG.md

### Performance & Size

- [ ] **No new large deps** - Check package.json for new dependencies
- [ ] **Bundle size** - Run `npm run build` and check dist/index.js size
- [ ] **Startup time** - CLI startup time reasonable

## Common Issues to Watch For

### Type Safety

❌ **Avoid:**
```typescript
const data: any = loadData();  // Any type
function process(x) { }        // Implicit any
```

✅ **Prefer:**
```typescript
const data: ProfileData = loadProfile(name);
function process(x: string): void { }
```

### Error Handling

❌ **Avoid:**
```typescript
try {
  await task();
} catch (e) {
  // Silent failure
}
```

✅ **Prefer:**
```typescript
try {
  await task();
} catch (error) {
  logger.error('Task failed', {
    task: taskName,
    error: (error as Error).message
  });
  throw error;
}
```

### Security

❌ **Avoid:**
```typescript
const path = join(root, userInput);  // Path traversal risk
```

✅ **Prefer:**
```typescript
const resolver = new PathResolver({ projectRoot: root });
const path = await resolver.resolve(userInput);  // Validated
```

### Logging

❌ **Avoid:**
```typescript
console.log('Profile loaded');  // No structure
```

✅ **Prefer:**
```typescript
logger.info('Profile loaded', {
  name: profileName,
  path: profilePath
});
```

## Testing Checklist

### Unit Tests

- [ ] Test happy path
- [ ] Test edge cases
- [ ] Test error cases
- [ ] Mock external dependencies
- [ ] Fast execution (<1s per suite)

### Integration Tests

- [ ] Test CLI command integration
- [ ] Use temp directory for file operations
- [ ] Mock providers (AUTOMATOSX_MOCK_PROVIDERS=true)
- [ ] Clean up after tests

### E2E Tests

- [ ] Test complete user workflows
- [ ] Use real config, real file system
- [ ] Mock providers
- [ ] Verify final state

## Performance Checklist

- [ ] **Lazy load** - Heavy modules use `await import()`
- [ ] **Cache** - Expensive operations cached with TTL
- [ ] **Batch** - Batch file operations where possible
- [ ] **Async** - Use async/await for I/O operations
- [ ] **Profile** - Profile if performance-critical code

## Security Checklist

- [ ] **Path traversal** - No `../` in paths without validation
- [ ] **Input validation** - All user inputs validated/sanitized
- [ ] **File permissions** - Workspaces have restrictive permissions (700)
- [ ] **Size limits** - File size limits to prevent DoS
- [ ] **Safe YAML** - Use safe YAML parsing (no unsafe schemas)

## Documentation Checklist

- [ ] **JSDoc** - Public functions have JSDoc
- [ ] **Comments** - Complex logic explained
- [ ] **Examples** - Usage examples for complex features
- [ ] **README** - Updated if adding user-facing features
- [ ] **CHANGELOG** - Entry added for changes

---

**Last Updated:** 2025-10-07
**For:** AutomatosX v4.0+
