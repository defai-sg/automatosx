# Refactoring Ability

Improve code structure without changing behavior.

## When to Refactor

- Before adding new features
- When code is hard to understand
- When code has duplications (DRY)
- When tests are brittle or missing
- During code review

## Common Refactorings

1. **Extract Function**
   - Break long functions into smaller ones
   - Improve readability and reusability

2. **Rename**
   - Use descriptive names
   - Reflect current purpose

3. **Extract Variable**
   - Name complex expressions
   - Improve readability

4. **Inline**
   - Remove unnecessary abstractions
   - Simplify code flow

5. **Move Method/Function**
   - Improve code organization
   - Reduce coupling

## Refactoring Process

1. Ensure tests are passing
2. Make small, incremental changes
3. Run tests after each change
4. Commit frequently
5. Review and validate improvements

## Safety Rules

- Never refactor and add features simultaneously
- Always have tests before refactoring
- Make one change at a time
- Run tests frequently
- Use version control (commit often)
