# Project Rules

## Skill Review Requirement

Whenever working on any task - new features, bug fixes, API integrations, process improvements, or connecting new services - always review the work to determine if a SKILL.md can be created.

### When to create a skill:
- A new process or workflow is established
- A new API or service is connected
- A repeatable pattern is identified
- A multi-step task could be simplified with a skill

### How to create a skill:
- Use the `create-skill` personal skill or create manually
- Save to `~/.claude/skills/<skill-name>/SKILL.md` for personal skills
- Save to `.claude/skills/<skill-name>/SKILL.md` for project skills
- Include clear instructions, required tools, and examples

### Skill checklist:
- [ ] Is this process repeatable?
- [ ] Would a skill save time in future?
- [ ] Does it involve specific steps that could be forgotten?
- [ ] Does it connect to an external service or API?

If any answer is yes, create a skill.

## Project Conventions

- This is a learning project for the Anthropic Agent SDK
- All code includes BEGINNER NOTE comments for learning purposes
- Learning guides are in the `learning/` folder
- Command reference is in `docs/COMMANDS.md`
- Phase-based development approach (currently through Phase 14)

## API Keys and Secrets

- Never commit `.env` files or API keys
- Use `.env.example` for documenting required variables
- MCP configs with keys go in `.claude/mcp.json` (gitignored)
