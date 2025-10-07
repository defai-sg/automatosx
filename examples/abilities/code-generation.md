# Code Generation Mastery

Master the art of generating high-quality, production-ready code across multiple languages and paradigms. This ability covers language-specific patterns, best practices, error handling, testing, and real-world code examples.

## Table of Contents

1. [TypeScript/JavaScript Patterns](#typescript-javascript-patterns)
2. [Python Best Practices](#python-best-practices)
3. [Error Handling Strategies](#error-handling-strategies)
4. [API Design Patterns](#api-design-patterns)
5. [Testing Code Generation](#testing-code-generation)
6. [Common Pitfalls](#common-pitfalls)
7. [Quick Reference](#quick-reference)

---

## TypeScript/JavaScript Patterns

### Type-Safe Function Design

```typescript
// ✅ Good: Type-safe with proper error handling
async function fetchUser(id: string): Promise<User> {
  if (!id || id.trim() === '') {
    throw new Error('User ID is required');
  }

  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return validateUser(data); // Validate response structure
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error(`Failed to fetch user ${id}: ${(error as Error).message}`);
  }
}

// ❌ Bad: No types, poor error handling, no validation
async function fetchUser(id) {
  return await fetch(`/api/users/${id}`).then(r => r.json());
}
```

**💡 Why the good example is better:**
- ✅ Type safety: `Promise<User>` ensures return type
- ✅ Input validation: Checks for empty/invalid ID
- ✅ Error handling: Try-catch with specific error messages
- ✅ HTTP status check: Validates response before parsing
- ✅ Data validation: `validateUser()` ensures correct structure
- ✅ Error context: Logs and wraps errors with context

---

### Interface and Type Design

```typescript
// ✅ Good: Well-designed types with documentation
/**
 * User profile data
 */
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * User role enumeration
 */
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

/**
 * Create user request payload
 */
interface CreateUserRequest {
  email: string;
  name: string;
  role?: UserRole; // Optional, defaults to USER
}

/**
 * Update user request payload
 */
type UpdateUserRequest = Partial<Omit<User, 'id' | 'createdAt'>>;

// ❌ Bad: Vague types, no documentation
interface UserData {
  data: any;
  stuff: object;
  things?: string[];
}
```

**💡 Best Practices:**
- ✅ Use descriptive interface names (User, not UserData)
- ✅ Document with JSDoc comments
- ✅ Use enums for fixed values (UserRole)
- ✅ Use utility types (Partial, Omit, Pick) for variations
- ✅ Avoid `any` and `object` - be specific
- ✅ Mark optional fields explicitly with `?`

---

### Class Design with SOLID Principles

```typescript
// ✅ Good: Single Responsibility, Dependency Injection
/**
 * User repository for database operations
 */
class UserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return row ? this.mapToUser(row) : null;
  }

  async create(data: CreateUserRequest): Promise<User> {
    const now = new Date();
    const user: User = {
      id: generateId(),
      email: data.email,
      name: data.name,
      role: data.role ?? UserRole.USER,
      createdAt: now,
      updatedAt: now
    };

    await this.db.query(
      'INSERT INTO users (id, email, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, user.email, user.name, user.role, user.createdAt, user.updatedAt]
    );

    return user;
  }

  private mapToUser(row: DatabaseRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as UserRole,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

/**
 * User service for business logic
 */
class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService
  ) {}

  async registerUser(data: CreateUserRequest): Promise<User> {
    // Validation
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Check if user exists
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = await this.userRepo.create(data);

    // Send welcome email (async, don't block)
    this.emailService.sendWelcome(user.email).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    return user;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// ❌ Bad: God class, tight coupling, mixed concerns
class UserManager {
  async doEverything(email, name) {
    // Database access mixed with business logic
    const db = new Database();
    const user = db.query('INSERT INTO users...');

    // Email sending mixed with user creation
    const smtp = new SmtpClient();
    smtp.send(email, 'Welcome');

    return user;
  }
}
```

**💡 SOLID Principles Applied:**
- ✅ **S**ingle Responsibility: UserRepository (data), UserService (logic)
- ✅ **O**pen/Closed: Extensible through interfaces
- ✅ **L**iskov Substitution: Can swap Database implementations
- ✅ **I**nterface Segregation: Small, focused interfaces
- ✅ **D**ependency Inversion: Depend on abstractions (Database interface)

---

## Python Best Practices

### Type Hints and Validation

```python
# ✅ Good: Type hints with runtime validation
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import re

@dataclass
class User:
    """User profile data"""
    id: str
    email: str
    name: str
    role: str
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        """Validate data after initialization"""
        if not self.id:
            raise ValueError("User ID is required")
        if not self._is_valid_email(self.email):
            raise ValueError(f"Invalid email format: {self.email}")
        if self.role not in ['admin', 'user', 'guest']:
            raise ValueError(f"Invalid role: {self.role}")

    @staticmethod
    def _is_valid_email(email: str) -> bool:
        """Validate email format"""
        pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        return re.match(pattern, email) is not None

class UserRepository:
    """User repository for database operations"""

    def __init__(self, db_connection):
        self._db = db_connection

    def find_by_id(self, user_id: str) -> Optional[User]:
        """
        Find user by ID

        Args:
            user_id: User ID to search for

        Returns:
            User object if found, None otherwise

        Raises:
            DatabaseError: If database query fails
        """
        try:
            row = self._db.query(
                "SELECT * FROM users WHERE id = ?",
                (user_id,)
            )
            return self._map_to_user(row) if row else None
        except Exception as e:
            raise DatabaseError(f"Failed to find user {user_id}") from e

    def create(self, email: str, name: str, role: str = 'user') -> User:
        """
        Create new user

        Args:
            email: User email address
            name: User full name
            role: User role (default: 'user')

        Returns:
            Created User object

        Raises:
            ValueError: If validation fails
            DatabaseError: If database insert fails
        """
        now = datetime.utcnow()
        user = User(
            id=self._generate_id(),
            email=email,
            name=name,
            role=role,
            created_at=now,
            updated_at=now
        )

        try:
            self._db.execute(
                "INSERT INTO users (id, email, name, role, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (user.id, user.email, user.name, user.role, user.created_at, user.updated_at)
            )
            self._db.commit()
        except Exception as e:
            self._db.rollback()
            raise DatabaseError(f"Failed to create user") from e

        return user

    def _map_to_user(self, row: Dict[str, Any]) -> User:
        """Map database row to User object"""
        return User(
            id=row['id'],
            email=row['email'],
            name=row['name'],
            role=row['role'],
            created_at=datetime.fromisoformat(row['created_at']),
            updated_at=datetime.fromisoformat(row['updated_at']),
            metadata=row.get('metadata')
        )

    @staticmethod
    def _generate_id() -> str:
        """Generate unique user ID"""
        import uuid
        return str(uuid.uuid4())

# ❌ Bad: No types, no validation, poor error handling
class UserRepo:
    def get_user(self, id):
        return self.db.query("SELECT * FROM users WHERE id = " + id)  # SQL injection!

    def add_user(self, data):
        self.db.insert(data)  # No validation, no error handling
```

**💡 Python Best Practices:**
- ✅ Type hints for all parameters and returns
- ✅ Dataclasses for simple data structures
- ✅ `__post_init__` for validation
- ✅ Docstrings with Args/Returns/Raises
- ✅ Use `from ... import Error` for exception chaining
- ✅ Parameterized queries (prevent SQL injection)
- ✅ Transaction management (commit/rollback)

---

## Error Handling Strategies

### Explicit Error Handling (TypeScript)

```typescript
// ✅ Good: Explicit error types with context
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(
    message: string,
    public resource: string,
    public id: string
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class UserService {
  async getUser(id: string): Promise<User> {
    // Input validation
    if (!id || id.trim() === '') {
      throw new ValidationError(
        'User ID is required',
        'id',
        id
      );
    }

    // Fetch user
    const user = await this.userRepo.findById(id);

    if (!user) {
      throw new NotFoundError(
        `User not found`,
        'User',
        id
      );
    }

    return user;
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    try {
      // Validate email
      if (!this.isValidEmail(data.email)) {
        throw new ValidationError(
          'Invalid email format',
          'email',
          data.email
        );
      }

      // Check for duplicates
      const existing = await this.userRepo.findByEmail(data.email);
      if (existing) {
        throw new ValidationError(
          'Email already registered',
          'email',
          data.email
        );
      }

      // Create user
      return await this.userRepo.create(data);
    } catch (error) {
      // Re-throw known errors
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      // Wrap unknown errors
      throw new Error(
        `Failed to create user: ${(error as Error).message}`
      );
    }
  }
}

// API layer error handling
async function handleCreateUser(req: Request, res: Response) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        error: 'Validation failed',
        field: error.field,
        message: error.message
      });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({
        error: 'Not found',
        resource: error.resource,
        message: error.message
      });
    } else {
      console.error('Unexpected error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    }
  }
}

// ❌ Bad: Generic errors with no context
async function getUser(id) {
  const user = await db.query(...);
  if (!user) {
    throw new Error('Error'); // No context!
  }
  return user;
}
```

**💡 Error Handling Principles:**
- ✅ Create custom error classes for different scenarios
- ✅ Include context (field, value, resource, id)
- ✅ Re-throw known errors, wrap unknown errors
- ✅ Map errors to appropriate HTTP status codes
- ✅ Don't expose internal errors to clients
- ✅ Log unexpected errors for debugging

---

## API Design Patterns

### RESTful API Design

```typescript
// ✅ Good: RESTful API with proper structure
import express, { Router } from 'express';
import { body, param, validationResult } from 'express-validator';

const router = Router();

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get(
  '/users/:id',
  [
    param('id').isUUID().withMessage('Invalid user ID format')
  ],
  async (req, res, next) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Fetch user
      const user = await userService.getUser(req.params.id);

      res.json({
        data: user,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error); // Pass to error handler middleware
    }
  }
);

/**
 * POST /api/users
 * Create new user
 */
router.post(
  '/users',
  [
    body('email').isEmail().withMessage('Invalid email format'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').optional().isIn(['admin', 'user', 'guest']).withMessage('Invalid role')
  ],
  async (req, res, next) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Create user
      const user = await userService.createUser(req.body);

      res.status(201).json({
        data: user,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/users/:id
 * Update user (partial)
 */
router.patch(
  '/users/:id',
  [
    param('id').isUUID(),
    body('email').optional().isEmail(),
    body('name').optional().trim().notEmpty(),
    body('role').optional().isIn(['admin', 'user', 'guest'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await userService.updateUser(req.params.id, req.body);

      res.json({
        data: user,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete(
  '/users/:id',
  [
    param('id').isUUID()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await userService.deleteUser(req.params.id);

      res.status(204).send(); // No content
    } catch (error) {
      next(error);
    }
  }
);

// Error handler middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: {
        type: 'ValidationError',
        message: error.message,
        field: error.field
      }
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: {
        type: 'NotFoundError',
        message: error.message,
        resource: error.resource
      }
    });
  }

  // Unexpected errors
  console.error('Unexpected error:', error);
  res.status(500).json({
    error: {
      type: 'InternalError',
      message: 'An unexpected error occurred'
    }
  });
});

// ❌ Bad: Inconsistent, no validation, poor error handling
router.get('/getUser', async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE id = ' + req.query.id); // SQL injection!
  res.send(user);
});

router.post('/user/create', async (req, res) => {
  const user = await db.insert(req.body); // No validation!
  res.send({ success: true, user });
});
```

**💡 RESTful API Best Practices:**
- ✅ Use proper HTTP methods (GET, POST, PATCH, DELETE)
- ✅ Use resource-based URLs (`/users/:id`, not `/getUser`)
- ✅ Validate all inputs with express-validator
- ✅ Return appropriate HTTP status codes (200, 201, 400, 404, 500)
- ✅ Use consistent response structure (`{ data, meta }`)
- ✅ Centralized error handling middleware
- ✅ Return 204 No Content for DELETE

---

## Testing Code Generation

### Unit Testing with TDD

```typescript
// ✅ Good: Comprehensive tests with edge cases
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from './user-service';
import { UserRepository } from './user-repository';
import { ValidationError, NotFoundError } from './errors';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Create mock repository
    mockUserRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    } as any;

    userService = new UserService(mockUserRepo);
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      };
      mockUserRepo.findById.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUser('123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepo.findById).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundError when user not found', async () => {
      // Arrange
      mockUserRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUser('999'))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw ValidationError for empty ID', async () => {
      // Act & Assert
      await expect(userService.getUser(''))
        .rejects
        .toThrow(ValidationError);

      // Should not call repository for invalid input
      expect(mockUserRepo.findById).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for whitespace ID', async () => {
      await expect(userService.getUser('   '))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const createData = {
        email: 'new@example.com',
        name: 'New User',
        role: 'user'
      };
      const mockCreatedUser = { id: '456', ...createData };

      mockUserRepo.findByEmail.mockResolvedValue(null); // No duplicate
      mockUserRepo.create.mockResolvedValue(mockCreatedUser);

      // Act
      const result = await userService.createUser(createData);

      // Assert
      expect(result).toEqual(mockCreatedUser);
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockUserRepo.create).toHaveBeenCalledWith(createData);
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const invalidData = {
        email: 'not-an-email',
        name: 'Test',
        role: 'user'
      };

      // Act & Assert
      await expect(userService.createUser(invalidData))
        .rejects
        .toThrow(ValidationError);

      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for duplicate email', async () => {
      // Arrange
      const duplicateData = {
        email: 'existing@example.com',
        name: 'Test',
        role: 'user'
      };
      mockUserRepo.findByEmail.mockResolvedValue({ id: '123' } as any);

      // Act & Assert
      await expect(userService.createUser(duplicateData))
        .rejects
        .toThrow(ValidationError);

      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('should use default role when not provided', async () => {
      // Arrange
      const dataWithoutRole = {
        email: 'test@example.com',
        name: 'Test User'
      };
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue({ id: '123', ...dataWithoutRole, role: 'user' } as any);

      // Act
      await userService.createUser(dataWithoutRole);

      // Assert
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user' })
      );
    });
  });
});

// ❌ Bad: Minimal tests, no edge cases
describe('UserService', () => {
  it('works', async () => {
    const user = await userService.getUser('123');
    expect(user).toBeDefined();
  });
});
```

**💡 Testing Best Practices:**
- ✅ Use AAA pattern (Arrange, Act, Assert)
- ✅ Test happy path AND edge cases
- ✅ Test error conditions
- ✅ Use descriptive test names (`should ... when ...`)
- ✅ Mock external dependencies
- ✅ Verify mock calls with `toHaveBeenCalledWith`
- ✅ Test default values and optional parameters

---

## Common Pitfalls

### Pitfall 1: Ignoring Edge Cases

```typescript
// ❌ Bad: No edge case handling
function divide(a: number, b: number): number {
  return a / b; // What if b is 0?
}

// ✅ Good: Handle edge cases explicitly
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error('Invalid input: must be finite numbers');
  }
  return a / b;
}
```

### Pitfall 2: Silent Failures

```typescript
// ❌ Bad: Silent failure
async function updateUser(id: string, data: any) {
  try {
    await userRepo.update(id, data);
  } catch (error) {
    // Silent failure - error swallowed!
  }
}

// ✅ Good: Fail loudly with context
async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  try {
    const user = await userRepo.update(id, data);
    return user;
  } catch (error) {
    console.error('Failed to update user:', { id, error });
    throw new Error(`Failed to update user ${id}: ${(error as Error).message}`);
  }
}
```

### Pitfall 3: Overly Complex Functions

```typescript
// ❌ Bad: God function doing everything
async function handleUserRegistration(email, name, password, address, phone, ...more) {
  // 200 lines of code
  // Validation, hashing, database, email, logging, analytics...
}

// ✅ Good: Single Responsibility - delegate to specialized functions
async function registerUser(data: RegistrationData): Promise<User> {
  // Validate
  validateRegistrationData(data);

  // Create user
  const user = await createUser({
    email: data.email,
    name: data.name,
    passwordHash: await hashPassword(data.password)
  });

  // Send welcome email (async, don't block)
  sendWelcomeEmail(user).catch(handleEmailError);

  // Track analytics (async, don't block)
  trackUserRegistration(user).catch(handleAnalyticsError);

  return user;
}
```

### Pitfall 4: Mutation Instead of Immutability

```typescript
// ❌ Bad: Mutates input
function addItem(array: any[], item: any) {
  array.push(item); // Mutates!
  return array;
}

// ✅ Good: Returns new array (immutable)
function addItem<T>(array: T[], item: T): T[] {
  return [...array, item]; // New array
}
```

---

## Quick Reference

### Code Generation Checklist

**Type Safety:**
- [ ] All function parameters have types
- [ ] All return types are explicitly defined
- [ ] No use of `any` or `unknown` without justification
- [ ] Interfaces and types are well-documented

**Error Handling:**
- [ ] Input validation for all public functions
- [ ] Explicit error types (custom error classes)
- [ ] Try-catch blocks for async operations
- [ ] Errors include context (field, value, id)
- [ ] No silent failures (always throw or log)

**Testing:**
- [ ] Unit tests for all public methods
- [ ] Tests cover happy path + edge cases
- [ ] Tests verify error conditions
- [ ] Mocks for external dependencies
- [ ] Descriptive test names

**Code Quality:**
- [ ] Functions are small and focused (< 50 lines)
- [ ] Descriptive variable and function names
- [ ] JSDoc/TSDoc comments for public APIs
- [ ] No code duplication (DRY)
- [ ] Follows SOLID principles

**API Design:**
- [ ] RESTful URLs (resource-based)
- [ ] Proper HTTP methods (GET, POST, PATCH, DELETE)
- [ ] Input validation (express-validator)
- [ ] Appropriate HTTP status codes
- [ ] Consistent response structure

---

## Summary

Generating high-quality code requires:

1. **Type Safety** - Use TypeScript, define all types explicitly
2. **Error Handling** - Explicit errors, no silent failures, include context
3. **Testing** - TDD approach, test happy path + edge cases + errors
4. **Code Quality** - SOLID principles, small functions, DRY, descriptive names
5. **API Design** - RESTful, validated inputs, appropriate status codes
6. **Edge Cases** - Handle division by zero, null/undefined, empty strings, etc.

**Remember:**
- Code is read 10x more than written - optimize for readability
- Fail fast, fail loudly - explicit errors over silent failures
- Tests are documentation that never goes out of date
- Simplicity is the ultimate sophistication

Use this ability to generate production-ready code with proper types, error handling, tests, and documentation.
