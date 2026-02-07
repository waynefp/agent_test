# Phase 15: Multi-Agent Patterns

## What You'll Learn

- What multi-agent systems are and when to use them
- Core orchestration patterns (Supervisor, Chain, Parallel, Handoff)
- Communication between agents
- Building multi-agent workflows with the Anthropic SDK
- Real-world use cases and best practices

---

## Why Multiple Agents?

A single agent can handle many tasks, but some problems benefit from **specialization**:

| Single Agent | Multi-Agent |
|-------------|-------------|
| Jack of all trades | Specialists working together |
| One system prompt | Focused prompts per agent |
| All tools loaded | Only relevant tools per agent |
| Can get confused on complex tasks | Each agent has a clear role |
| Simpler to build | More powerful for complex workflows |

### When to Use Multi-Agent

- **Complex workflows** with distinct phases (research → write → review)
- **Different expertise** needed (code, writing, analysis)
- **Parallel work** where tasks are independent
- **Quality control** where one agent checks another's work
- **Long-running tasks** that benefit from breaking into steps

---

## The 4 Core Patterns

### Pattern 1: Supervisor (Manager/Worker)

One agent coordinates others. Like a project manager delegating tasks.

```
                ┌──────────┐
                │Supervisor│
                └────┬─────┘
           ┌─────────┼─────────┐
           ▼         ▼         ▼
      ┌────────┐ ┌────────┐ ┌────────┐
      │Worker 1│ │Worker 2│ │Worker 3│
      │Research│ │ Write  │ │ Review │
      └────────┘ └────────┘ └────────┘
```

**When to use:** Complex tasks needing coordination, dynamic task assignment

**Example:** "Research a topic, write an article, then review it"
- Supervisor decides what to do next
- Research agent gathers information
- Writing agent creates the article
- Review agent checks quality

```typescript
// Supervisor Pattern Example
class SupervisorAgent {
  private workers: Map<string, Agent>;
  private supervisor: Agent;

  constructor() {
    // Supervisor has a high-level view
    this.supervisor = new Agent({
      systemPrompt: `You are a project supervisor. Analyze tasks and
      delegate to the right worker. Available workers:
      - researcher: Finds information and data
      - writer: Creates content and documents
      - reviewer: Checks quality and accuracy

      Respond with which worker should handle the task and what
      instructions to give them.`,
    });

    // Each worker is specialized
    this.workers = new Map([
      ['researcher', new Agent({
        systemPrompt: 'You are a research specialist. Find accurate, current information.',
        // Only has web search tool
      })],
      ['writer', new Agent({
        systemPrompt: 'You are a writing specialist. Create clear, engaging content.',
        // Only has file writing tools
      })],
      ['reviewer', new Agent({
        systemPrompt: 'You are a quality reviewer. Check for accuracy, clarity, and completeness.',
        // Only has reading tools
      })],
    ]);
  }

  async run(task: string): Promise<string> {
    // 1. Supervisor analyzes the task
    const plan = await this.supervisor.chat(
      `Plan this task: ${task}`
    );

    // 2. Execute each step with the right worker
    let context = '';
    for (const step of plan.steps) {
      const worker = this.workers.get(step.worker);
      const result = await worker.chat(
        `${step.instructions}\n\nContext so far: ${context}`
      );
      context += `\n${step.worker} result: ${result}`;
    }

    // 3. Supervisor provides final summary
    return await this.supervisor.chat(
      `Summarize the final result: ${context}`
    );
  }
}
```

---

### Pattern 2: Chain (Pipeline)

Agents work in sequence. Output of one becomes input to the next.

```
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│ Agent 1│───▶│ Agent 2│───▶│ Agent 3│───▶│ Agent 4│
│Research│    │ Draft  │    │ Edit   │    │ Format │
└────────┘    └────────┘    └────────┘    └────────┘
```

**When to use:** Linear workflows, content pipelines, data transformation

**Example:** "Research → Draft → Edit → Format"

```typescript
// Chain Pattern Example
class AgentChain {
  private agents: Agent[];

  constructor(agents: Agent[]) {
    this.agents = agents;
  }

  async run(input: string): Promise<string> {
    let result = input;

    for (const agent of this.agents) {
      // Each agent processes and passes to the next
      result = await agent.chat(result);
    }

    return result;
  }
}

// Usage
const chain = new AgentChain([
  new Agent({ systemPrompt: 'Research the topic and provide key facts.' }),
  new Agent({ systemPrompt: 'Write a draft article from these facts.' }),
  new Agent({ systemPrompt: 'Edit for clarity, grammar, and flow.' }),
  new Agent({ systemPrompt: 'Format as a professional document with headers.' }),
]);

const article = await chain.run('AI agents in 2026');
```

---

### Pattern 3: Parallel (Fan-out/Fan-in)

Multiple agents work simultaneously on different parts.

```
                ┌──────────┐
                │ Splitter │
                └────┬─────┘
           ┌─────────┼─────────┐
           ▼         ▼         ▼
      ┌────────┐ ┌────────┐ ┌────────┐
      │Agent A │ │Agent B │ │Agent C │
      │ Part 1 │ │ Part 2 │ │ Part 3 │
      └────┬───┘ └────┬───┘ └────┬───┘
           └─────────┼─────────┘
                ┌────▼─────┐
                │ Combiner │
                └──────────┘
```

**When to use:** Independent subtasks, speed optimization, multiple perspectives

**Example:** "Analyze a product from 3 angles simultaneously"

```typescript
// Parallel Pattern Example
class ParallelAgents {
  private agents: Agent[];
  private combiner: Agent;

  constructor(agents: Agent[], combiner: Agent) {
    this.agents = agents;
    this.combiner = combiner;
  }

  async run(task: string): Promise<string> {
    // Run all agents in parallel
    const results = await Promise.all(
      this.agents.map(agent => agent.chat(task))
    );

    // Combine results
    const combined = results
      .map((r, i) => `Perspective ${i + 1}: ${r}`)
      .join('\n\n');

    return await this.combiner.chat(
      `Synthesize these perspectives into one cohesive analysis:\n${combined}`
    );
  }
}

// Usage
const analyzer = new ParallelAgents(
  [
    new Agent({ systemPrompt: 'Analyze from a technical perspective.' }),
    new Agent({ systemPrompt: 'Analyze from a business perspective.' }),
    new Agent({ systemPrompt: 'Analyze from a user experience perspective.' }),
  ],
  new Agent({ systemPrompt: 'Combine multiple analyses into a comprehensive report.' })
);

const analysis = await analyzer.run('Evaluate this product idea: ...');
```

---

### Pattern 4: Handoff (Routing)

Agents pass control based on the task type. Like being transferred between departments.

```
         ┌──────────┐
         │  Router  │
         └────┬─────┘
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Sales  │ │Support │ │Billing │
│ Agent  │ │ Agent  │ │ Agent  │
└────────┘ └────────┘ └────────┘
```

**When to use:** Customer service, different expertise areas, classification-based routing

**Example:** Route customer queries to the right department

```typescript
// Handoff Pattern Example
class AgentRouter {
  private router: Agent;
  private agents: Map<string, Agent>;

  constructor() {
    this.router = new Agent({
      systemPrompt: `You are a routing agent. Classify the user's request
      into one of these categories and respond with ONLY the category name:
      - sales: Pricing, plans, purchasing
      - support: Technical issues, bugs, how-to
      - billing: Invoices, payments, refunds
      - general: Everything else`,
    });

    this.agents = new Map([
      ['sales', new Agent({
        systemPrompt: 'You are a sales specialist. Help with pricing and plans.',
      })],
      ['support', new Agent({
        systemPrompt: 'You are a support specialist. Help resolve technical issues.',
      })],
      ['billing', new Agent({
        systemPrompt: 'You are a billing specialist. Help with payments and invoices.',
      })],
      ['general', new Agent({
        systemPrompt: 'You are a general assistant. Help with any questions.',
      })],
    ]);
  }

  async route(message: string): Promise<string> {
    // 1. Classify the message
    const category = await this.router.chat(message);
    const categoryClean = category.trim().toLowerCase();

    // 2. Route to the right agent
    const agent = this.agents.get(categoryClean) || this.agents.get('general')!;

    // 3. Get response from specialized agent
    return await agent.chat(message);
  }
}
```

---

## Choosing the Right Pattern

```
Is the task sequential?
  YES → Chain Pattern

Can parts run independently?
  YES → Parallel Pattern

Does the task need different specialists?
  YES → Does one agent coordinate?
    YES → Supervisor Pattern
    NO  → Handoff Pattern
```

### Pattern Comparison

| Pattern | Speed | Complexity | Best For |
|---------|-------|-----------|----------|
| **Supervisor** | Medium | High | Complex coordination |
| **Chain** | Slow (sequential) | Low | Content pipelines |
| **Parallel** | Fast | Medium | Independent subtasks |
| **Handoff** | Fast | Medium | Classification/routing |

---

## Communication Between Agents

### Shared Context

```typescript
// Pass context between agents via a shared object
interface AgentContext {
  task: string;
  research: string;
  draft: string;
  feedback: string;
  final: string;
}

const context: AgentContext = { task: '', research: '', draft: '', feedback: '', final: '' };

// Each agent reads from and writes to context
context.research = await researchAgent.chat(context.task);
context.draft = await writerAgent.chat(
  `Write based on this research: ${context.research}`
);
context.feedback = await reviewerAgent.chat(
  `Review this draft: ${context.draft}`
);
```

### Message Passing

```typescript
// Agents communicate through structured messages
interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'handoff';
  content: string;
  metadata?: Record<string, unknown>;
}

class MessageBus {
  private handlers: Map<string, (msg: AgentMessage) => Promise<void>>;

  async send(message: AgentMessage): Promise<void> {
    const handler = this.handlers.get(message.to);
    if (handler) {
      await handler(message);
    }
  }
}
```

---

## Real-World Use Cases

### 1. Content Creation Pipeline (Chain)
```
Topic → Research Agent → Writing Agent → Editor Agent → Published Article
```

### 2. Code Review System (Supervisor)
```
Supervisor → Code Analyzer (find issues)
           → Security Reviewer (check vulnerabilities)
           → Style Checker (enforce conventions)
           → Summary Agent (compile report)
```

### 3. Customer Service (Handoff)
```
Router → FAQ Agent (common questions)
       → Technical Agent (bugs/issues)
       → Escalation Agent (complex problems)
       → Billing Agent (payment issues)
```

### 4. Market Analysis (Parallel)
```
Task → Competitor Analyst ──┐
     → Trend Analyst ───────┤→ Synthesis Agent → Report
     → Financial Analyst ───┘
```

### 5. Document Processing (Chain + Parallel)
```
Document → Extractor → [Parallel: Summarizer + Classifier + Entity Extractor] → Combiner → Output
```

---

## Best Practices

### 1. Keep Agents Focused
```typescript
// GOOD: Focused system prompt
systemPrompt: 'You are a code reviewer. Only analyze code quality,
bugs, and security issues. Do not rewrite the code.'

// BAD: Vague system prompt
systemPrompt: 'You are a helpful assistant that can do anything.'
```

### 2. Limit Tools Per Agent
```typescript
// GOOD: Only relevant tools
const researchAgent = new Agent({
  tools: [webSearchTool],  // Only what it needs
});

// BAD: All tools
const researchAgent = new Agent({
  tools: [webSearchTool, fileWriteTool, bashTool, imageTool], // Too many
});
```

### 3. Handle Failures Gracefully
```typescript
async function runWithFallback(primary: Agent, fallback: Agent, task: string) {
  try {
    return await primary.chat(task);
  } catch (error) {
    logger.warn(`Primary agent failed, using fallback: ${error}`);
    return await fallback.chat(task);
  }
}
```

### 4. Add Logging Between Agents
```typescript
async function agentStep(name: string, agent: Agent, input: string): Promise<string> {
  logger.info(`[${name}] Starting...`);
  const start = Date.now();
  const result = await agent.chat(input);
  logger.info(`[${name}] Completed in ${Date.now() - start}ms`);
  return result;
}
```

### 5. Set Boundaries
```typescript
// Prevent infinite loops in supervisor pattern
const MAX_ITERATIONS = 10;
let iterations = 0;

while (!isComplete && iterations < MAX_ITERATIONS) {
  const nextStep = await supervisor.chat('What should we do next?');
  // ... execute step
  iterations++;
}
```

---

## Exercise: Build a Research + Write Pipeline

Create a two-agent chain:

**Agent 1 - Researcher:**
- System prompt: Research specialist
- Given a topic, returns key facts and sources

**Agent 2 - Writer:**
- System prompt: Writing specialist
- Takes research and creates a structured article

**Bonus:**
- Add a third agent for editing/review
- Implement as a reusable AgentChain class

---

## Practical Implementation: Multi-Agent Framework

We built a reusable multi-agent framework! See the code at:

- **Framework:** `src/multi-agent/` - Reusable pattern implementations
  - `WorkerAgent.ts` - Lightweight agent with optional tool support (mini agentic loop)
  - `patterns/AgentChain.ts` - Chain pattern (sequential)
  - `patterns/ParallelAgents.ts` - Parallel pattern (fan-out/fan-in)
  - `patterns/SupervisorAgent.ts` - Supervisor pattern (manager/worker)
  - `patterns/AgentRouter.ts` - Router pattern (classification-based handoff)
  - `types.ts` - AgentRole, AgentResult, PipelineResult, etc.

- **Demo:** `src/multi-agent/examples/demo-pipeline.ts`
  - Shows a Parallel + Chain pipeline with web search tools
  - Template for building your own multi-agent projects

### How to Run the Demo

```bash
npm run demo:multi-agent                          # Default topic
npx tsx src/multi-agent/examples/demo-pipeline.ts "your topic here"
```

### Key Design: WorkerAgent with Tool Support

WorkerAgent automatically adapts based on whether an agent has tools:

```
AgentRole WITH tools → runWithTools() → mini agentic loop (up to 15 turns)
  Claude calls tool → execute → send result → Claude continues → ...

AgentRole WITHOUT tools → runSimple() → single API call (fast)
  Claude responds immediately with text
```

### Using This as a Foundation

This project is designed as a **reusable agent foundation**. To build a new
multi-agent project on top of it:

1. Copy/fork this project
2. Define your AgentRole configs (system prompts, tools, temperature)
3. Wire them into patterns (Chain, Parallel, Supervisor, Router)
4. All the infrastructure is already built: tools, retry logic, streaming, etc.

---

## What's Next?

You now understand the core multi-agent patterns!

**Next phases:**
- Phase 16: Structured Outputs (JSON mode, schema validation)
- Phase 17: Testing & Evaluation
- Phase 18: Advanced Orchestration (combining patterns)

**Key takeaway:** Start with the simplest pattern that works. You can always add complexity later.
