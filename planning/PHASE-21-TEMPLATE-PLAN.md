# Phase 21: Template Creation - Planning Document

**Status**: 📋 Planning
**Goal**: Create a reusable agent foundation template for future projects

---

## 🎯 Vision

Create **`agent-sdk-foundation`** - a clean, well-documented template that can be forked for new projects:
- ✅ Freelance Research Agent
- ✅ POD Research Agent
- ✅ Custom business agents
- ✅ Any domain-specific agent

---

## 📦 What Makes a Good Template

### Core Principles

1. **Minimal but Complete**
   - All essential features included
   - No project-specific code
   - Clean, commented codebase

2. **Easy to Customize**
   - Clear extension points
   - Good documentation
   - Examples provided

3. **Production-Ready**
   - Error handling
   - Security (guardrails)
   - Testing setup
   - Deployment guides

4. **Well-Documented**
   - README with quick start
   - Architecture docs
   - Customization guide
   - Example projects

---

## 🗂️ Template Structure

```
agent-sdk-foundation/
├── 📁 src/
│   ├── agent/              # Core agent implementation
│   ├── tools/              # Tool system (base + examples)
│   ├── multi-agent/        # Multi-agent framework
│   ├── cli/                # CLI interface
│   ├── utils/              # Shared utilities
│   ├── config/             # Configuration
│   └── types/              # TypeScript types
│
├── 📁 examples/            # Example projects
│   ├── basic-chatbot/     # Simple Q&A bot
│   ├── research-agent/    # Web research agent
│   └── task-manager/      # Task management agent
│
├── 📁 docs/                # Documentation
│   ├── GETTING_STARTED.md
│   ├── ARCHITECTURE.md
│   ├── CUSTOMIZATION.md
│   ├── TOOLS.md
│   ├── MULTI_AGENT.md
│   └── DEPLOYMENT.md
│
├── 📁 tests/               # Test suite
│
├── 📄 README.md            # Main documentation
├── 📄 CLAUDE.md            # Template instructions
├── 📄 package.json
├── 📄 tsconfig.json
└── 📄 .env.example
```

---

## 🧹 What to Include vs. Remove

### ✅ Include (Core Foundation)

**Agent Core:**
- ✅ Agent class with agentic loop
- ✅ Streaming support
- ✅ Context management
- ✅ Session persistence

**Tool System:**
- ✅ BaseTool class
- ✅ ToolRegistry
- ✅ ToolExecutor
- ✅ Example tools (Calculator, FileSystem, Task, WebSearch)

**Multi-Agent:**
- ✅ WorkerAgent
- ✅ Patterns (Chain, Parallel, Supervisor, Router)
- ✅ Example pipelines

**Features:**
- ✅ Extended thinking
- ✅ Structured outputs
- ✅ Guardrails & validation
- ✅ Parallel tool execution

**CLI:**
- ✅ Interactive CLI
- ✅ Commands (/help, /save, /load, etc.)
- ✅ Image support

**Utilities:**
- ✅ Logger
- ✅ Retry logic
- ✅ Error handling

### ❌ Remove (Project-Specific)

**Project-Specific Tools:**
- ❌ Google Drive sync (move to example)
- ❌ Daily briefing app (move to example)
- ❌ Memory tool (or make it optional)

**Project-Specific Files:**
- ❌ GDRIVE_*.md files
- ❌ PROJECT_SUMMARY.md (create template version)
- ❌ Specific learning guides (create template guides)
- ❌ .claude/settings.local.json

**Development Files:**
- ❌ Old test scripts
- ❌ Experimental code
- ❌ Personal configurations

### 🔄 Modify (Make Generic)

**Configuration:**
- 🔄 .env.example (remove specific API keys)
- 🔄 CLAUDE.md (generic template instructions)
- 🔄 README.md (template quick start)

**Package.json:**
- 🔄 Name: `agent-sdk-foundation`
- 🔄 Description: Generic template description
- 🔄 Remove project-specific scripts

---

## 📝 Template Documentation

### 1. README.md (Main Entry Point)

```markdown
# Agent SDK Foundation

A production-ready template for building AI agents using the Anthropic SDK.

## Features

- 🤖 Complete agent implementation with agentic loop
- 🔧 Extensible tool system
- 👥 Multi-agent framework (Chain, Parallel, Supervisor)
- 💭 Extended thinking & structured outputs
- 🛡️ Security guardrails & validation
- ⚡ Parallel tool execution
- 💾 Session persistence
- 🖼️ Vision support
- 📊 Real-time streaming

## Quick Start

1. Clone this template:
   ```bash
   git clone https://github.com/yourusername/agent-sdk-foundation.git my-agent
   cd my-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Add your ANTHROPIC_API_KEY
   ```

4. Run the agent:
   ```bash
   npm start
   ```

## Customization

See [CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for:
- Adding custom tools
- Creating multi-agent pipelines
- Configuring behavior
- Deploying to production

## Examples

Check the `examples/` folder for complete example projects:
- Basic Chatbot
- Research Agent
- Task Manager Agent

## Documentation

- [Getting Started](docs/GETTING_STARTED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Tools Guide](docs/TOOLS.md)
- [Multi-Agent](docs/MULTI_AGENT.md)
- [Deployment](docs/DEPLOYMENT.md)

## License

MIT
```

### 2. CUSTOMIZATION.md

```markdown
# Customization Guide

## Adding a Custom Tool

1. Create a new tool file:
   ```typescript
   // src/tools/definitions/MyTool.ts
   import { BaseTool } from './BaseTool.js';
   import { z } from 'zod';

   export class MyTool extends BaseTool {
     name = 'my_tool';
     description = 'What this tool does';

     inputSchema = z.object({
       input: z.string(),
     });

     async execute(input: z.infer<typeof this.inputSchema>) {
       // Your logic here
       return { result: 'success' };
     }
   }
   ```

2. Register the tool:
   ```typescript
   // src/tools/ToolRegistry.ts
   import { MyTool } from './definitions/MyTool.js';

   registry.register(new MyTool());
   ```

3. Use it in the agent!

## Creating a Multi-Agent Pipeline

[... detailed guide ...]

## Customizing the CLI

[... detailed guide ...]
```

### 3. ARCHITECTURE.md

```markdown
# Architecture Overview

## Core Components

### Agent
The main agent class handles:
- Conversation management
- Agentic loop (autonomous tool use)
- Context management
- Streaming responses

### Tool System
- **BaseTool**: Abstract base class
- **ToolRegistry**: Manages available tools
- **ToolExecutor**: Executes tools safely

### Multi-Agent Framework
- **WorkerAgent**: Lightweight agent for sub-tasks
- **Patterns**: Reusable orchestration patterns

[... detailed architecture docs ...]
```

---

## 🎯 Template Features Checklist

### Essential Features ✅
- [x] Agent with agentic loop
- [x] Tool system (base + 4 examples)
- [x] Multi-agent framework
- [x] CLI interface
- [x] Session persistence
- [x] Streaming responses
- [x] Error handling
- [x] Configuration system

### Advanced Features ✅
- [x] Extended thinking
- [x] Structured outputs
- [x] Guardrails & validation
- [x] Parallel tool execution
- [x] Vision support
- [x] Context management

### Development Experience ✅
- [x] TypeScript setup
- [x] ESLint + Prettier
- [x] Test framework
- [x] Development scripts
- [x] Build process

### Documentation ✅
- [x] README with quick start
- [x] Architecture documentation
- [x] Customization guide
- [x] API reference
- [x] Example projects
- [x] Deployment guide

---

## 📋 Template Creation Process

### Step 1: Create New Repository

```bash
# Create fresh template repo
git clone https://github.com/waynefp/agent_test.git agent-sdk-foundation
cd agent-sdk-foundation

# Remove git history (fresh start)
rm -rf .git
git init
```

### Step 2: Clean Up Files

```bash
# Remove project-specific files
rm -rf output/
rm GDRIVE_*.md
rm PROJECT_SUMMARY.md
rm learning/*.md  # Keep template versions

# Remove personal configs
rm .claude/settings.local.json
```

### Step 3: Update Generic Files

```bash
# Update package.json
# Update README.md
# Update CLAUDE.md
# Create .env.example
```

### Step 4: Create Documentation

```bash
mkdir -p docs
# Create all doc files
```

### Step 5: Create Examples

```bash
mkdir -p examples
# Create example projects
```

### Step 6: Test Template

```bash
# Fresh install test
rm -rf node_modules
npm install
npm start

# Verify all features work
```

### Step 7: Publish Template

```bash
# Create GitHub repo
# Push template
# Add template tag
# Create release
```

---

## 🎓 Example Projects

### Example 1: Basic Chatbot

**Purpose**: Simple Q&A bot
**Tools**: Calculator, WebSearch
**Location**: `examples/basic-chatbot/`

```typescript
// Minimal setup
import { Agent } from '@agent-sdk/foundation';
import { CalculatorTool, WebSearchTool } from '@agent-sdk/foundation/tools';

const agent = new Agent({
  tools: [new CalculatorTool(), new WebSearchTool()],
});

agent.start();
```

### Example 2: Research Agent

**Purpose**: Web research with multi-agent pipeline
**Tools**: WebSearch, GoogleTrends
**Location**: `examples/research-agent/`

```typescript
// Multi-agent research pipeline
import { AgentChain } from '@agent-sdk/foundation/multi-agent';

const pipeline = new AgentChain([
  {
    name: 'Researcher',
    systemPrompt: 'Research the topic...',
    tools: [webSearch, googleTrends],
  },
  {
    name: 'Summarizer',
    systemPrompt: 'Summarize findings...',
  },
]);

const result = await pipeline.execute(userQuery);
```

### Example 3: Freelance Research (Your Use Case!)

**Purpose**: Research freelance opportunities
**Tools**: WebSearch, GoogleTrends, Freelancer API
**Location**: `examples/freelance-research/`

This would be a separate project built on the template.

---

## 🚀 Distribution Strategy

### Option A: GitHub Template

**Pros:**
- ✅ Easy to use ("Use this template" button)
- ✅ Stays updated with main repo
- ✅ Good for open source

**How:**
1. Create repo with template tag
2. Enable "Template repository" in settings
3. Users click "Use this template"

### Option B: NPM Package

**Pros:**
- ✅ Easy installation (`npm create agent-sdk`)
- ✅ Version management
- ✅ Can include CLI scaffolder

**How:**
```bash
# Create CLI scaffolder
npx create-agent-sdk my-agent
```

### Option C: Both! (Recommended)

1. **GitHub Template** - For learning & customization
2. **NPM Package** - For quick starts

---

## 📊 Success Criteria

Template is complete when:
- ✅ Can be cloned and run immediately
- ✅ All core features work out-of-box
- ✅ Documentation is comprehensive
- ✅ 3 example projects included
- ✅ Easy to add custom tools
- ✅ Easy to create multi-agent pipelines
- ✅ Production deployment guide included
- ✅ Used successfully in 1 real project (Freelance Research)

---

## 🗓️ Timeline

### Week 1: Cleanup
- Remove project-specific code
- Update configurations
- Clean file structure

### Week 2: Documentation
- Write comprehensive docs
- Create example projects
- Add inline comments

### Week 3: Testing
- Test template installation
- Verify all features
- Fix issues

### Week 4: Publishing
- Create GitHub template
- (Optional) Create NPM package
- Write blog post / announcement

---

## 🔗 Related Projects

Once template is ready, create:

1. **Freelance Research Agent** (your first project!)
   - Fork template
   - Add Freelancer.com API
   - Add Upwork API
   - Custom research tools

2. **POD Research Agent**
   - Fork template
   - Add POD marketplaces API
   - Trend analysis tools
   - Design research

3. **General Research Template**
   - Research-focused tools
   - Data collection
   - Report generation

---

## 💡 Template Naming Ideas

- `agent-sdk-foundation` ✅ (Clear, professional)
- `anthropic-agent-template`
- `ai-agent-starter`
- `claude-agent-kit`

**Recommendation**: `agent-sdk-foundation`

---

## 📚 Template README Badges

```markdown
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Node](https://img.shields.io/badge/Node-18+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Stars](https://img.shields.io/github/stars/username/agent-sdk-foundation)
```

---

**Next Steps:**
1. Review this plan
2. Start with cleanup phase
3. Create documentation
4. Build first example (Freelance Research)
