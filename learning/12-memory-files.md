# Phase 13: Memory Files & Configuration

## What You'll Learn

- The 5 types of CLAUDE.md files
- Where each file is located
- Priority and precedence rules
- When to use each type
- Difference between CLAUDE.md and settings.json
- Best practices for organizing content

## Why This Matters

Before building advanced features like Skills, you need to understand how Claude Code reads instructions. The CLAUDE.md system lets you customize Claude's behavior at multiple levels - from organization-wide policies down to your personal preferences on a single project.

## The 5 Types of Memory Files

### Overview

| Type | Location | Shared? | Purpose |
|------|----------|---------|---------|
| **Managed Policy** | System folder | Org-wide (enforced) | Enterprise security/compliance |
| **Project Memory** | `./CLAUDE.md` | Git (team) | Project conventions |
| **Project Rules** | `./.claude/rules/*.md` | Git (team) | Modular, path-specific |
| **User Memory** | `~/.claude/CLAUDE.md` | No (personal) | Your global preferences |
| **Project Local** | `./CLAUDE.local.md` | No (gitignored) | Personal project setup |

---

## Type 1: Managed Policy (Organization-Level)

### Location
```
Windows:  C:\Program Files\ClaudeCode\CLAUDE.md
macOS:    /Library/Application Support/ClaudeCode/CLAUDE.md
Linux:    /etc/claude-code/CLAUDE.md
```

### Characteristics
- **Highest priority** - Cannot be overridden
- Deployed by IT/DevOps via configuration management
- Applies to ALL users in the organization
- Individual developers cannot change these

### When to Use
- Company-wide coding standards
- Security requirements (authentication, logging)
- Compliance mandates (HIPAA, SOC2, PCI)
- Forbidden patterns or libraries

### Example Content
```markdown
# Organization Security Standards

## Required Practices
- All API endpoints must require authentication
- Secrets must NEVER be logged or committed
- All database queries must use parameterized statements
- Code must pass security linting before deployment

## Forbidden
- Do not use `eval()` or `Function()` constructor
- Do not disable SSL verification
- Do not store credentials in code
```

### Who Uses This?
Mostly enterprises. If you're an individual developer or small team, you probably won't use this level.

---

## Type 2: Project Memory (Team-Shared)

### Location
```
./CLAUDE.md                    # Project root
./.claude/CLAUDE.md            # Alternative (recommended for larger projects)
```

### Characteristics
- **Checked into git** - Shared with your team
- Applies to everyone working on the project
- Should be reviewed and maintained as code evolves
- Most common type you'll use

### When to Use
- Project architecture overview
- Team coding conventions
- Common commands (build, test, lint)
- Repository structure explanation
- PR and branch naming conventions

### Example Content
```markdown
# Agent SDK Learning Project

## Tech Stack
TypeScript, Node.js, Anthropic SDK, Zod

## Code Style
- ES modules only (import/export)
- 2-space indentation
- Use `const` by default, `let` when needed, never `var`
- Explicit return types on functions

## Commands
- Dev: `npm run dev`
- Test: `npm run test`
- Build: `npm run build`
- Type check: `npx tsc --noEmit`

## Architecture
- Agent logic: `src/agent/`
- Tools: `src/tools/definitions/`
- Types: `src/types/`
- CLI: `src/cli/`

## Testing
- Run tests before committing
- Test files: `tests/**/*.test.ts`
```

---

## Type 3: Project Rules (Modular, Team-Shared)

### Location
```
./.claude/rules/
├── code-style.md
├── testing.md
├── security.md
├── frontend/
│   ├── react.md
│   └── styles.md
└── backend/
    ├── api.md
    └── database.md
```

### Characteristics
- Lives in `.claude/rules/` directory
- Each file is a separate `.md` file
- Supports **path-based filtering** with frontmatter
- Great for large projects with different conventions per area
- Automatically discovered and loaded

### When to Use
- Large projects where one CLAUDE.md would be unwieldy
- Different rules for frontend vs backend
- Language-specific guidelines
- Path-specific conventions

### Example: Path-Specific Rules

```markdown
# .claude/rules/typescript.md
---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# TypeScript Guidelines
- Enable strict mode
- Use explicit return types
- Avoid `any` - use `unknown` if truly needed
- Prefer interfaces for objects, types for unions
```

```markdown
# .claude/rules/testing.md
---
paths:
  - "tests/**/*.test.ts"
  - "**/*.spec.ts"
---

# Testing Conventions
- Use describe() blocks to organize
- Test both happy path and error cases
- Mock external dependencies
- Name tests: "should [expected behavior] when [condition]"
```

### Key Feature: Conditional Loading
The `paths` frontmatter means Claude only loads these rules when working with matching files!

---

## Type 4: User Memory (Personal, Global)

### Location
```
Windows:  C:\Users\<username>\.claude\CLAUDE.md
macOS/Linux:  ~/.claude/CLAUDE.md
```

### Characteristics
- **Your personal preferences** across ALL projects
- Not shared with anyone
- Lower priority than project settings
- Consistent experience everywhere you work

### When to Use
- Your preferred code style (if different from teams)
- Personal workflow shortcuts
- Tools or commands you always use
- Cross-project habits

### Example Content
```markdown
# My Personal Claude Preferences

## Code Style
- I prefer semicolons at end of statements
- I like comprehensive comments on complex logic
- Use descriptive variable names, not abbreviations

## Workflow
- Always show git status before making changes
- I prefer atomic commits with detailed messages
- Show file diffs before committing

## Tools I Prefer
- I use `pnpm` instead of npm
- I prefer `vitest` for testing
- Use `biome` for linting when available
```

---

## Type 5: Project Local (Personal, Project-Specific)

### Location
```
./CLAUDE.local.md    # In project root, automatically gitignored
```

### Characteristics
- **Your personal setup for THIS project only**
- Automatically added to `.gitignore`
- Highest priority for project-level settings
- Only visible to you on your machine

### When to Use
- Local development URLs and ports
- Personal test credentials
- Machine-specific configuration
- Private notes about the project
- Sandbox or staging URLs you use

### Example Content
```markdown
# My Local Setup

## Development URLs
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Database UI: http://localhost:5555

## Test Credentials (local only)
- Test user: test@example.local
- Password: localdev123
- API key: sk_test_local_key

## My Environment
- Node version: 20.10.0
- Database: PostgreSQL 15
- DB name: myapp_dev

## Notes
- Remember to run migrations after pulling
- The /admin route requires VPN
```

---

## Priority & Precedence

When multiple files exist, Claude loads them in this order:

```
1. Managed Policy      ← Highest (cannot override)
2. Project Local       ← Your project preferences
3. Project Memory      ← Team settings
4. Project Rules       ← Modular team rules
5. User Memory         ← Your global preferences (lowest)
```

### How It Works

**Layered Loading**: Claude reads ALL applicable files, with higher-priority files overriding lower ones.

**Example Scenario**:
- User Memory says: "Use tabs for indentation"
- Project Memory says: "Use 2-space indentation"
- Result: **2-space indentation** (Project overrides User)

**Another Example**:
- Project Memory says: "Run `npm test` for tests"
- Project Local says: "I use `npm run test:watch` for faster feedback"
- Result: Claude knows both, but prioritizes **your local preference** when you're testing

---

## CLAUDE.md vs settings.json

These serve different purposes:

| Aspect | CLAUDE.md | settings.json |
|--------|-----------|---------------|
| **Format** | Markdown | JSON |
| **Purpose** | Instructions & context | Permissions & tools |
| **Content** | Natural language | Structured rules |
| **Controls** | How Claude behaves | What Claude can do |

### Example Comparison

**CLAUDE.md** - What Claude should do:
```markdown
# Testing Workflow
Always run tests after making changes:
- Single file: `npm run test -- <filename>`
- Full suite: `npm run test`
```

**settings.json** - What Claude is allowed to do:
```json
{
  "permissions": {
    "allow": [
      "Bash(npm run test:*)",
      "Bash(npm run build)"
    ]
  }
}
```

---

## Best Practices

### 1. Keep It Concise
Ask yourself: "Would removing this cause Claude to make mistakes?"
- If Claude can figure it out from code, don't include it
- If Claude keeps ignoring something, it might be buried in too much text

### 2. Use Imports for Organization
```markdown
# CLAUDE.md

# Project Overview
@README.md

# API Design Standards
@docs/api-conventions.md

# Development Setup
@docs/setup.md
```

### 3. Separate Concerns
- **Project Memory**: What the TEAM needs to know
- **Project Local**: What YOU need for YOUR setup
- **User Memory**: Your PERSONAL style across all projects

### 4. Review Regularly
Treat CLAUDE.md like code - update it as the project evolves.

### 5. Use /init to Bootstrap
```bash
/init
```
This command analyzes your project and generates a starter CLAUDE.md.

---

## Quick Reference: Recommended Structure

```
project/
├── CLAUDE.md                    # Team project instructions
├── CLAUDE.local.md              # [gitignored] Your personal setup
├── .claude/
│   ├── settings.json            # Permissions (team)
│   ├── settings.local.json      # [gitignored] Your permissions
│   └── rules/                   # Modular guidelines
│       ├── code-style.md
│       ├── testing.md
│       └── api-design.md
```

For your home directory:
```
~/.claude/
├── CLAUDE.md                    # Your global preferences
└── settings.json                # Your global permissions
```

---

## Practical Exercise

Create memory files for this Agent SDK project:

1. **Project Memory** (`CLAUDE.md`) - Already exists, but review it
2. **Project Local** (`CLAUDE.local.md`) - Create with your local setup
3. **User Memory** (`~/.claude/CLAUDE.md`) - Create with your personal preferences

---

## Quiz: Test Your Understanding

Now let's make sure you've got this down. For each scenario below, identify which CLAUDE.md file type should be used.

### Question 1
> Your company requires all code to pass security scanning before deployment. Every developer must follow this rule. Which file type?

**Think about it before reading the answer...**

<details>
<summary>Click to reveal answer</summary>

**Managed Policy** - This is an organization-wide requirement that cannot be overridden. IT would deploy this to the system location.

</details>

---

### Question 2
> Your team decided that all API endpoints should return errors in a specific JSON format. Where does this go?

**Think about it...**

<details>
<summary>Click to reveal answer</summary>

**Project Memory** (`./CLAUDE.md`) - This is a team convention that should be shared via git so everyone follows the same pattern.

</details>

---

### Question 3
> You prefer using `pnpm` instead of `npm` across all your projects, but your teams use different package managers. Where do you specify this?

**Think about it...**

<details>
<summary>Click to reveal answer</summary>

**User Memory** (`~/.claude/CLAUDE.md`) - This is your personal preference that applies globally but can be overridden by project settings.

</details>

---

### Question 4
> Your local development database runs on port 5433 instead of the default 5432. Your teammates use different ports. Where does this go?

**Think about it...**

<details>
<summary>Click to reveal answer</summary>

**Project Local** (`./CLAUDE.local.md`) - This is your personal project-specific configuration that shouldn't be shared.

</details>

---

### Question 5
> Your project has different coding conventions for React components vs. Node.js backend code. You want Claude to apply different rules depending on which files it's editing. Which approach?

**Think about it...**

<details>
<summary>Click to reveal answer</summary>

**Project Rules** (`./.claude/rules/`) - Use separate rule files with `paths` frontmatter:
- `.claude/rules/react.md` with `paths: ["src/components/**"]`
- `.claude/rules/backend.md` with `paths: ["src/api/**"]`

</details>

---

### Question 6
> You want to tell Claude "always run tests before committing" but your teammate prefers to run tests manually. Where should this instruction go?

**Think about it...**

<details>
<summary>Click to reveal answer</summary>

**Project Local** (`./CLAUDE.local.md`) - Since this is YOUR workflow preference for this project, not a team-wide requirement.

Alternatively, if you want this across ALL your projects, use **User Memory** (`~/.claude/CLAUDE.md`).

</details>

---

### Question 7
> What's the priority order? If Project Memory says "use 4-space indentation" and User Memory says "use tabs", which wins?

**Think about it...**

<details>
<summary>Click to reveal answer</summary>

**Project Memory wins** - It has higher priority than User Memory.

Priority order (highest to lowest):
1. Managed Policy
2. Project Local
3. Project Memory ← wins
4. Project Rules
5. User Memory ← overridden

</details>

---

### Question 8
> You're setting up permission to allow Claude to run `npm test` without asking. Is this CLAUDE.md or settings.json?

**Think about it...**

<details>
<summary>Click to reveal answer</summary>

**settings.json** - Permissions go in settings files, not CLAUDE.md.

```json
{
  "permissions": {
    "allow": ["Bash(npm test:*)"]
  }
}
```

CLAUDE.md is for instructions/context, settings.json is for permissions/configuration.

</details>

---

### Question 9
> A new developer joins your team. What files will they automatically get when they clone the repo?

**Think about it...**

<details>
<summary>Click to reveal answer</summary>

They will get:
- **Project Memory** (`./CLAUDE.md`) - checked into git
- **Project Rules** (`./.claude/rules/`) - checked into git
- **settings.json** (`./.claude/settings.json`) - if checked in

They will NOT get:
- **Project Local** (`./CLAUDE.local.md`) - gitignored
- **settings.local.json** - gitignored
- **User Memory** (`~/.claude/CLAUDE.md`) - on your machine only
- **Managed Policy** - deployed by IT

</details>

---

### Question 10
> You want to include your project's README content in the CLAUDE.md without duplicating it. How?

**Think about it...**

<details>
<summary>Click to reveal answer</summary>

Use the **import syntax**:

```markdown
# CLAUDE.md

# Project Overview
@README.md

# More instructions...
```

The `@` symbol imports the referenced file's content.

</details>

---

## How Did You Do?

- **8-10 correct**: You've got this! Ready to use memory files effectively.
- **5-7 correct**: Good understanding, review the types you missed.
- **0-4 correct**: Re-read the sections above and try the quiz again.

---

## What's Next?

In **Phase 14 (Skills System)**, you'll learn to:
- Define agent behaviors in skill files
- Load skills dynamically
- Create modular, reusable agent capabilities

Understanding memory files helps because skills can be configured and customized using these same patterns!
