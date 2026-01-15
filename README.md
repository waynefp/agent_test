# Agent SDK Learning Project

A hands-on learning project for building conversational AI agents using the Anthropic Agent SDK.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Add your API key to .env file
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Run interactive chat
npm run dev

# Or run automated test
npm run test-agent
```

## 📖 Documentation

- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Complete progress summary and reference guide
- **[Implementation Plan](./.claude/plans/delightful-wibbling-russell.md)** - Detailed 8-phase roadmap

## ✅ Current Status

**Phase 1: Foundation** ✅ Complete
- Project setup with TypeScript
- Type definitions for all components
- Logging and error handling utilities

**Phase 2: Core Agent** ✅ Complete
- Conversational agent that talks to Claude
- Multi-turn conversations with memory
- Interactive CLI interface
- Token usage tracking

**Phase 3: Tool System** 🔜 Next
- Create custom tools (calculator, file operations, etc.)
- Tool registry and execution
- Zod schema validation

## 🎯 What This Project Does

This is a **learning-focused project** that teaches you how to:

1. Build conversational AI agents with the Anthropic SDK
2. Manage conversation history and state
3. Create custom tools for your agent
4. Track tasks and sub-agents
5. Build production-ready TypeScript applications

## 💬 Usage

### Interactive Chat

```bash
npm run dev
```

Commands available in chat:
- `/help` - Show available commands
- `/clear` - Clear conversation history
- `/history` - View past messages
- `/stats` - See token usage statistics
- `/exit` - Quit the chat

### Test Script

```bash
npm run test-agent
```

Runs an automated 2-question conversation to verify everything works.

## 🏗️ Project Structure

```
Agent_SDK-Test/
├── src/
│   ├── agent/              # Agent logic & conversation management
│   ├── cli/                # CLI interface (display, prompts, commands)
│   ├── config/             # Environment & Anthropic client config
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Logger & error utilities
├── data/                   # Saved conversations & tasks (future)
├── docs/                   # Documentation
├── tests/                  # Unit & integration tests (future)
└── examples/               # Learning examples (future)
```

## 🧠 What You'll Learn

### Technical Skills
- TypeScript (types, interfaces, async/await)
- Node.js development
- API integration (Anthropic SDK)
- State management
- CLI development
- Error handling

### Software Engineering
- Design patterns (Singleton, Factory, Strategy)
- Separation of concerns
- Type safety
- Testing strategies
- Project organization

## 📋 Requirements

- **Node.js** 18+
- **npm** (comes with Node.js)
- **Anthropic API Key** (get free at https://console.anthropic.com)

## 🔑 Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API key:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. Optional configuration:
   ```bash
   ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
   MAX_TOKENS=2048
   LOG_LEVEL=info
   ```

## 🎓 Learning Path

This project follows an 8-phase learning path:

1. **Foundation** ✅ - Project setup, types, utilities
2. **Core Agent** ✅ - Conversational AI with memory
3. **Tool Foundation** 🔜 - Create custom tools
4. **Tool Integration** - Agent autonomously uses tools
5. **Task Tracking** - Track tasks and subtasks
6. **Persistence** - Save/load conversations
7. **Enhanced UX** - Better CLI experience
8. **Testing & Docs** - Production-quality code

## 📚 Resources

- [Anthropic SDK Docs](https://docs.anthropic.com/en/api/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Node.js Documentation](https://nodejs.org/docs/latest/api/)

## 🤝 Contributing

This is a personal learning project, but feel free to fork and adapt for your own learning!

## 📝 License

ISC

---

**Current Phase:** 2/8 Complete | **Next:** Tool System Foundation

For detailed progress and concepts learned, see [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
