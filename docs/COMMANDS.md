# Agent Command Reference

Quick reference for all available commands in the agent CLI.

---

## General Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/exit` or `/quit` | Exit the agent (prompts to save if you have messages) |
| `/clear` | Clear conversation history (asks for confirmation) |
| `/history` | Show the conversation history |
| `/stats` | Show token usage and message statistics |

---

## Session Commands (Save/Load)

| Command | Description |
|---------|-------------|
| `/save <name>` | Save current conversation with a name |
| `/load <name>` | Load a previously saved conversation |
| `/sessions` | List all saved sessions |
| `/session` | Show current session info |

### Examples
```
/save my-project-chat
/load my-project-chat
/sessions
```

---

## Image Commands (Vision)

| Command | Description |
|---------|-------------|
| `/image <path> [question]` | Analyze an image with optional question |
| `/image info <path>` | Get image info without sending to Claude |

### Examples
```
/image C:\Photos\screenshot.png What is in this image?
/image "C:\My Photos\image.jpg" Describe this
/image info C:\Photos\test.png
```

**Note:** Put paths with spaces in quotes.

---

## Extended Thinking Commands

| Command | Description |
|---------|-------------|
| `/thinking` | Toggle extended thinking on/off |
| `/thinking-budget <tokens>` | Set thinking token budget (1,000-100,000) |

### Examples
```
/thinking                    # Enable/disable thinking
/thinking-budget 5000        # Set 5K token budget
/thinking-budget             # Show current budget
```

**What is Extended Thinking?**
- Shows Claude's step-by-step reasoning before the final answer
- Great for: math, logic, planning, fact-checking, debugging
- Uses additional tokens (costs more)
- Adds latency (slower responses)
- Disabled by default

**When to use:**
- Complex calculations or logic puzzles
- Fact-checking and verification
- Debugging code or analyzing trade-offs

**When NOT to use:**
- Simple questions or creative writing
- Time-sensitive or cost-sensitive tasks

---

## Task Commands

| Command | Description |
|---------|-------------|
| `/tasks` | List all tasks |
| `/task add <description>` | Add a new task |
| `/task done <id>` | Mark a task as complete |
| `/task remove <id>` | Remove a task |
| `/task clear` | Clear all tasks |

### Examples
```
/task add Implement login feature
/task done 1
/tasks
```

---

## Context Commands

| Command | Description |
|---------|-------------|
| `/context` | Show current context size |
| `/context add <text>` | Add text to context |
| `/context clear` | Clear added context |

---

## Persona Commands

| Command | Description |
|---------|-------------|
| `/persona` | Show current persona |
| `/persona list` | List available personas |
| `/persona set <name>` | Switch to a different persona |
| `/persona info <name>` | Show details about a persona |

### Examples
```
/persona list
/persona set code-reviewer
/persona info friendly
```

---

## Tips

### Conversation Persistence
- Your conversation is **not automatically saved** when you exit
- Use `/save <name>` before exiting to keep your conversation
- The agent now prompts you to save when you type `/exit` or `/quit`

### Web Search
- The agent can search the web for current information
- Just ask naturally: "What's the latest news on AI?"
- Uses Perplexity AI if configured, otherwise DuckDuckGo

### Image Analysis
- Supports: JPG, PNG, GIF, WebP
- Max size: 20MB
- Path must come before the question

### File Operations
- The agent can read, write, and search files
- Ask naturally: "Read the package.json file"
- Or: "Create a new file called notes.txt"

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Cancel current operation / Exit |
| `Enter` | Submit message |
| `Up Arrow` | Previous message (in some terminals) |

---

## Need Help?

- Type `/help` in the agent for command list
- Check `learning/` folder for detailed guides
- See `PROJECT_SUMMARY.md` for project overview
