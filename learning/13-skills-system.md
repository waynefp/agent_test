# Phase 14: Skills System

## What You'll Learn

- What skills are and how they differ from CLAUDE.md
- How to create and structure skill files
- Automatic vs manual invocation
- Using arguments and dynamic values
- Best practices for effective skills
- Practical examples you can use

## What Are Skills?

Skills extend what Claude can do by teaching it **domain-specific knowledge** and **reusable workflows**. They're instructions that Claude can:
- Use **automatically** when relevant to the conversation
- Execute when you **invoke them directly** with `/skill-name`

Think of skills as specialized toolkits that bundle:
- **Knowledge**: Teaching Claude about patterns, conventions, or domain expertise
- **Workflows**: Step-by-step instructions for repeatable tasks
- **Context**: Information that persists across conversations

## Skills vs CLAUDE.md

This is the key distinction to understand:

| Aspect | Skills | CLAUDE.md |
|--------|--------|-----------|
| **When loaded** | On-demand (when invoked or relevant) | Every conversation automatically |
| **Context cost** | Low (only descriptions loaded until invoked) | High (entire file every session) |
| **Best for** | Domain knowledge, reusable workflows | Project conventions, universal rules |
| **Invocation** | `/skill-name` or automatic | Always applied |

### Decision Guide

**Use CLAUDE.md for:**
- Code style rules that apply to ALL work
- Required commands (build, test, lint)
- Universal project conventions
- Things Claude must ALWAYS know

**Use Skills for:**
- Domain-specific knowledge (API patterns, legacy systems)
- Reusable workflows (deploy, review PR, fix issue)
- Specialized instructions (security review, performance audit)
- Optional knowledge (triggered only when needed)

### Example Split

**CLAUDE.md** (always loaded):
```markdown
# Code Style
- Use ES modules, not CommonJS
- 2-space indentation

# Commands
- Test: npm run test
- Build: npm run build
```

**Skill** (loaded when relevant):
```yaml
---
name: api-patterns
description: REST API design patterns for this codebase
---
When designing API endpoints:
- Use RESTful naming
- Return consistent error formats
- Include request validation
```

---

## Where Do Skills Live?

### Location Hierarchy (Highest to Lowest Priority)

| Level | Path | Scope |
|-------|------|-------|
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<skill-name>/SKILL.md` | Current project only |

On Windows, personal skills go in:
```
C:\Users\<username>\.claude\skills\<skill-name>\SKILL.md
```

### Directory Structure

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── reference.md       # Detailed documentation (optional)
├── examples.md        # Usage examples (optional)
└── scripts/           # Helper scripts (optional)
    └── helper.sh
```

### Naming Conventions

- **Directory name** = command name (lowercase-with-hyphens)
- **Main file** = always `SKILL.md`
- **Max length** = 64 characters

---

## Creating Your First Skill

### Step 1: Create the Directory

```bash
# Personal skill (available in all projects)
mkdir -p ~/.claude/skills/explain-code

# Or project skill (just this project)
mkdir -p .claude/skills/explain-code
```

### Step 2: Create SKILL.md

```yaml
---
name: explain-code
description: Explains code with diagrams and analogies. Use when explaining how code works or when user asks "how does this work?"
---

When explaining code, always include:

1. **Start with an analogy**: Compare the code to something from everyday life
2. **Draw a diagram**: Use ASCII art to show the flow or structure
3. **Walk through step-by-step**: Explain what happens in sequence
4. **Highlight a gotcha**: What's a common mistake or misconception?

Keep explanations conversational and beginner-friendly.
```

### Step 3: Use the Skill

```
# Automatic invocation (Claude detects relevance)
"How does this authentication code work?"

# Manual invocation
/explain-code src/auth/login.ts
```

---

## SKILL.md Structure

### Basic Structure

```yaml
---
name: skill-name
description: What this skill does and when to use it
---

# Skill Content

Your instructions go here in markdown format.
```

### Frontmatter Options

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `name` | string | Command name (lowercase-hyphens) | directory name |
| `description` | string | When to use this skill (CRITICAL for auto-invocation) | First paragraph |
| `disable-model-invocation` | boolean | Prevent auto-loading (manual only) | `false` |
| `user-invocable` | boolean | Show in `/` menu | `true` |
| `allowed-tools` | string | Tools Claude can use without asking | (all need permission) |
| `argument-hint` | string | Hint for autocomplete | (none) |

### Example with All Options

```yaml
---
name: security-review
description: Review code for security vulnerabilities. Use when reviewing PRs or when user asks for security review.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Grep, Glob
argument-hint: [file-or-directory]
---

# Security Review Checklist

Review the specified code for:

1. **Injection vulnerabilities** (SQL, XSS, command injection)
2. **Authentication issues** (missing checks, weak validation)
3. **Secrets exposure** (hardcoded credentials, logged secrets)
4. **Data handling** (PII exposure, encryption)

Output findings as:
- CRITICAL: Must fix before merge
- HIGH: Strongly recommended
- MEDIUM: Consider for next PR
```

---

## Invocation: Automatic vs Manual

### Automatic Invocation

Claude automatically loads skills when the conversation matches the skill's description.

```
User: "How does our rate limiting work?"
→ Claude sees this matches "api-patterns" skill description
→ Skill loads automatically
→ Claude applies the skill's instructions
```

**Requirements for auto-invocation:**
1. `disable-model-invocation: false` (default)
2. Description includes keywords users would naturally say
3. Description clearly explains WHEN to use the skill

### Manual Invocation

You trigger the skill directly:

```
/security-review src/auth/
/fix-issue 1234
/deploy production
```

**When to use manual-only** (`disable-model-invocation: true`):
- Deployment workflows
- Dangerous operations
- Actions you always want explicit control over

---

## Using Arguments

Skills can accept arguments that you pass when invoking.

### Defining Arguments

```yaml
---
name: fix-issue
description: Fix a GitHub issue
argument-hint: [issue-number]
---

## Fix GitHub Issue $0

1. Fetch the issue: `gh issue view $0`
2. Understand the problem
3. Implement the fix
4. Create PR referencing issue #$0
```

### Argument Placeholders

| Placeholder | Meaning |
|-------------|---------|
| `$ARGUMENTS` | All arguments as single string |
| `$0` | First argument |
| `$1` | Second argument |
| `$ARGUMENTS[N]` | Nth argument (0-indexed) |

### Example with Multiple Arguments

```yaml
---
name: migrate-component
description: Migrate a component between frameworks
argument-hint: [component-name] [from-framework] [to-framework]
---

Migrate the **$0** component from **$1** to **$2**.

Steps:
1. Find the $1 implementation of $0
2. Analyze its props, state, and lifecycle
3. Create equivalent $2 implementation
4. Update imports and tests
```

Usage: `/migrate-component Button React Vue`

---

## Best Practices

### 1. Write Clear, Specific Descriptions

The description determines when Claude auto-invokes your skill.

**Bad:**
```yaml
description: Code review
```

**Good:**
```yaml
description: Review code for security vulnerabilities, performance issues, and patterns. Use when reviewing PRs, analyzing security, or when user asks for code review.
```

### 2. Keep SKILL.md Focused (< 500 lines)

Move detailed content to supporting files:

```yaml
---
name: api-design
description: API design patterns
---

# Quick Reference

Use RESTful conventions and consistent error formats.

For detailed patterns, see [reference.md](reference.md)
For examples, see [examples.md](examples.md)
```

### 3. Use Frontmatter Strategically

**Manual-only workflows:**
```yaml
disable-model-invocation: true  # Only you can trigger
```

**Background knowledge:**
```yaml
user-invocable: false  # Only Claude sees it
```

**Read-only operations:**
```yaml
allowed-tools: Read, Grep, Glob  # Restrict dangerous tools
```

### 4. Test Your Description Keywords

After creating a skill, test that it triggers:

```
Skill description: "Fix a GitHub issue"

Test: "Fix issue #123"  → Should auto-invoke
Test: "Issue 456"       → Might not invoke
Test: "/fix-issue 456"  → Always works (explicit)
```

### 5. Document Arguments Clearly

If your skill uses arguments:

```yaml
---
name: compare
description: Compare two files
argument-hint: [file1] [file2]
---

Compare $0 with $1 and list the differences.
```

---

## Practical Examples

### Example 1: Explain Code (Auto-Invoke)

**Location**: `~/.claude/skills/explain-code/SKILL.md`

```yaml
---
name: explain-code
description: Explains code with visual diagrams and analogies. Use when explaining how code works, teaching about a codebase, or when user asks "how does this work?"
---

When explaining code:

1. **Start with an analogy**
   Compare to something from everyday life

2. **Draw a diagram**
   Use ASCII art to show flow/structure:
   ```
   Request → Auth → Handler → Database
              ↓
           Reject
   ```

3. **Walk through step-by-step**
   Explain what happens in sequence

4. **Highlight gotchas**
   Common mistakes or misconceptions

Keep explanations conversational and beginner-friendly.
```

### Example 2: Fix GitHub Issue (Manual + Arguments)

**Location**: `.claude/skills/fix-issue/SKILL.md`

```yaml
---
name: fix-issue
description: Fix a GitHub issue by number
disable-model-invocation: true
argument-hint: [issue-number]
---

## Fix GitHub Issue #$0

1. **Fetch issue details**
   ```bash
   gh issue view $0
   ```

2. **Understand the problem**
   - Read the issue description
   - Check comments for context
   - Identify acceptance criteria

3. **Find related code**
   - Search for files mentioned
   - Check existing tests
   - Look at similar implementations

4. **Implement the fix**
   - Follow project conventions
   - Add or update tests
   - Ensure tests pass

5. **Create PR**
   - Write descriptive commit message
   - Reference issue #$0 in PR description
   - Request review
```

Usage: `/fix-issue 1234`

### Example 3: Security Review (Read-Only)

**Location**: `.claude/skills/security-review/SKILL.md`

```yaml
---
name: security-review
description: Review code for security vulnerabilities
disable-model-invocation: true
allowed-tools: Read, Grep, Glob
argument-hint: [path]
---

# Security Review: $0

## Checklist

### 1. Injection Vulnerabilities
- [ ] SQL injection (parameterized queries?)
- [ ] XSS (sanitized output?)
- [ ] Command injection (shell execution?)

### 2. Authentication & Authorization
- [ ] Permission checks present?
- [ ] Sensitive access logged?

### 3. Secrets & Credentials
- [ ] No hardcoded keys/passwords?
- [ ] Secrets not logged?

### 4. Data Handling
- [ ] PII properly handled?
- [ ] Encryption for sensitive data?

## Output Format

Report findings as:
- **CRITICAL**: Must fix before merge
- **HIGH**: Strongly recommended
- **MEDIUM**: Consider for next PR
- **INFO**: FYI only

Include file path and line numbers for each finding.
```

Usage: `/security-review src/auth/`

### Example 4: API Conventions (Background Knowledge)

**Location**: `.claude/skills/api-conventions/SKILL.md`

```yaml
---
name: api-conventions
description: REST API design patterns for our services. Use when designing APIs, creating endpoints, or reviewing API code.
user-invocable: true
---

# API Conventions

## URL Patterns
- Use kebab-case: `/api/v1/user-profiles`
- Plural nouns: `/users`, `/products`
- Version in URL: `/v1/`, `/v2/`

## Response Format

```json
{
  "data": { /* payload */ },
  "meta": {
    "timestamp": "2024-01-30T10:00:00Z"
  }
}
```

## Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [
      { "field": "email", "message": "Invalid format" }
    ]
  }
}
```

## Status Codes
- 200: Success
- 400: Client error
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error
```

---

## Sharing Skills

### Personal Skills (All Your Projects)

```bash
# Move to personal location
mkdir -p ~/.claude/skills/my-skill
# Copy SKILL.md there
```

Now available in all your projects via `/my-skill`

### Project Skills (Team Sharing)

```bash
# Put in project .claude folder
.claude/skills/my-skill/SKILL.md
```

Commit to git - teammates get it when they clone.

### Priority When Names Conflict

If you have both:
- `~/.claude/skills/deploy/SKILL.md` (personal)
- `.claude/skills/deploy/SKILL.md` (project)

**Personal wins** (higher priority).

---

## Quick Reference

### Creating a Skill

```bash
# 1. Create directory
mkdir -p ~/.claude/skills/my-skill  # or .claude/skills/my-skill

# 2. Create SKILL.md
# - Add frontmatter (name, description)
# - Add markdown instructions

# 3. Test
# - Try keywords from description
# - Try /my-skill directly
```

### Frontmatter Cheat Sheet

```yaml
---
name: skill-name                    # Command name
description: When to use this       # CRITICAL for auto-invoke
disable-model-invocation: true      # Manual only
user-invocable: false               # Hidden from user
allowed-tools: Read, Grep           # Restrict tools
argument-hint: [arg1] [arg2]        # Autocomplete hint
---
```

### Argument Placeholders

```
$0          → First argument
$1          → Second argument
$ARGUMENTS  → All arguments
```

---

## Exercise: Create Your Own Skills

### Exercise 1: Code Explainer

Create a skill that explains code with analogies and diagrams.

**Requirements:**
- Auto-invokes when user asks "how does this work?"
- Includes step-by-step explanation format
- Uses ASCII diagrams

### Exercise 2: PR Review Checklist

Create a skill for reviewing pull requests.

**Requirements:**
- Manual invocation only
- Accepts PR number as argument
- Includes checklist for code quality, tests, documentation

### Exercise 3: Project-Specific Knowledge

Create a skill documenting your project's specific patterns or conventions.

**Requirements:**
- Auto-invokes when working with related code
- Includes examples
- References to documentation files

---

## Troubleshooting

### Skill Doesn't Auto-Invoke

1. Check description includes natural keywords
2. Verify with "What skills are available?"
3. Try explicit invocation: `/skill-name`

### Skill Triggers Too Often

1. Make description more specific
2. Add `disable-model-invocation: true`

### Arguments Not Working

1. Check placeholder syntax: `$0`, `$1`, `$ARGUMENTS`
2. Verify `argument-hint` in frontmatter

---

## What's Next?

You've now completed the core learning phases! You have:

- A working agent with tools, streaming, and persistence
- Vision capabilities for image analysis
- Understanding of memory files and configuration
- Skills for extending Claude's capabilities

**Future exploration:**
- Multi-agent patterns
- Structured output / JSON mode
- Advanced orchestration
- Building custom MCP servers

Congratulations on completing the Agent SDK Learning Project!
