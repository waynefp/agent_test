# Phase 20: Web UI Development - Planning Document

**Status**: 📋 Planning
**Goal**: Build a web-based UI to interact with the agent and visualize multi-agent pipelines

---

## 🎯 Project Vision

Create a modern web UI that provides:
1. **Chat Interface** - Interactive conversation with the agent
2. **Multi-Agent Visualization** - Real-time pipeline monitoring
3. **Tool Execution Display** - Show what tools are running
4. **Session Management** - Save/load conversations
5. **Settings Panel** - Configure agent behavior

---

## 🏗️ Architecture Options

### Option A: Full-Stack Next.js (Recommended)

**Tech Stack:**
- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **UI Library**: shadcn/ui + Tailwind CSS
- **State**: Zustand or React Context
- **Real-time**: Server-Sent Events (SSE) for streaming
- **API**: Next.js API routes wrapping the agent

**Pros:**
- ✅ Single codebase (frontend + backend)
- ✅ TypeScript end-to-end
- ✅ Can reuse existing agent code
- ✅ Built-in API routes
- ✅ Easy deployment (Vercel)

**Cons:**
- ❌ Requires learning Next.js
- ❌ Heavier than simple options

### Option B: Vite + Express

**Tech Stack:**
- **Frontend**: Vite + React + TypeScript
- **Backend**: Express.js
- **UI Library**: shadcn/ui + Tailwind CSS
- **Real-time**: WebSocket or SSE

**Pros:**
- ✅ Simpler, more traditional
- ✅ Clear frontend/backend separation
- ✅ Faster dev server (Vite)

**Cons:**
- ❌ Two separate codebases
- ❌ More setup required

### Option C: Electron Desktop App

**Tech Stack:**
- **Framework**: Electron
- **Frontend**: React + TypeScript
- **Backend**: Embedded in Electron main process

**Pros:**
- ✅ Native desktop app
- ✅ No server needed
- ✅ Offline capable

**Cons:**
- ❌ Larger bundle size
- ❌ Platform-specific builds

---

## 🎨 UI Design - Key Features

### 1. Chat Interface (Primary View)

```
┌─────────────────────────────────────────────────────────┐
│  Agent SDK Chat                            [Settings] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  👤 User                                  2:34 PM     │
│  What's the latest news on AI?                         │
│                                                         │
│  🤖 Assistant                            2:34 PM     │
│  [Using WebSearchTool...]                              │
│  I found several recent developments...                │
│                                                         │
│  📊 Multi-Agent Pipeline Active                        │
│  Research Agent → Fact Checker → Writer               │
│  [View Pipeline ➜]                                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Type your message...                      [Send] │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Message history with timestamps
- Tool execution indicators
- Multi-agent pipeline notifications
- Streaming responses (real-time typing)
- Code syntax highlighting
- File attachments (images)

### 2. Multi-Agent Visualization Panel

```
┌─────────────────────────────────────────────────────────┐
│  Pipeline: Daily Briefing                    [Live]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐          │
│  │Research │───▶│Fact     │───▶│Writer   │          │
│  │Agent    │    │Checker  │    │Agent    │          │
│  │✓ Done   │    │⏳Running│    │⏸ Waiting│          │
│  └─────────┘    └─────────┘    └─────────┘          │
│                                                         │
│  Current: Fact Checker                                 │
│  Tools: WebSearchTool, CalculatorTool                 │
│  Progress: 2/3 stories verified                       │
│                                                         │
│  [Expand Details] [Download Results]                   │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Visual pipeline flow (nodes + edges)
- Real-time status updates
- Agent progress indicators
- Tool usage tracking
- Expand for detailed logs
- Download/export results

### 3. Tool Execution Monitor

```
┌─────────────────────────────────────────────────────────┐
│  Active Tools                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔧 WebSearchTool                         Running     │
│     Query: "latest AI developments"                    │
│     Duration: 1.2s                                     │
│                                                         │
│  🔧 CalculatorTool                         ✓ Done     │
│     Operation: multiply(42, 5)                         │
│     Result: 210                                        │
│     Duration: 0.05s                                    │
│                                                         │
│  🔧 FileSystemTool                         ⏳ Running  │
│     Action: read("data.json")                          │
│     Duration: 0.3s                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Real-time tool execution list
- Tool parameters shown
- Execution duration
- Success/failure indicators
- Expand for full results

### 4. Settings & Configuration

```
┌─────────────────────────────────────────────────────────┐
│  Agent Settings                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Model Selection                                       │
│  ○ Haiku (Fast & Cheap)                               │
│  ● Sonnet (Balanced)                                   │
│  ○ Opus (Most Capable)                                │
│                                                         │
│  Features                                              │
│  ☑ Extended Thinking                                  │
│  ☑ Parallel Tool Execution                            │
│  ☑ Guardrails                                         │
│                                                         │
│  Limits                                                │
│  Max Turns: [25]                                       │
│  Thinking Budget: [10000] tokens                       │
│  Rate Limit: [10] req/min                             │
│                                                         │
│  [Save Settings] [Reset to Defaults]                   │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Model selection
- Toggle features (thinking, parallel tools, guardrails)
- Set limits and budgets
- API key management
- Export/import settings

### 5. Session Management Sidebar

```
┌────────────────┐
│  Sessions      │
├────────────────┤
│ 📝 Current     │
│   Unsaved      │
│                │
│ 📁 Saved       │
│ • AI Research  │
│ • Debug Session│
│ • Daily Chat   │
│                │
│ [New Session]  │
│ [Save Current] │
└────────────────┘
```

**Features:**
- List saved sessions
- Quick load
- Create new session
- Delete sessions
- Export to markdown

---

## 🔧 Technical Implementation

### Backend API Design

**Express Server** (wraps existing agent):

```typescript
// src/server/index.ts
import express from 'express';
import { Agent } from '../agent/Agent.js';
import { EventEmitter } from 'events';

const app = express();
const agentInstances = new Map<string, Agent>();

// SSE endpoint for streaming responses
app.get('/api/chat/stream/:sessionId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sessionId = req.params.sessionId;
  const agent = agentInstances.get(sessionId);

  // Stream agent responses
  agent.on('message', (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  agent.on('tool', (data) => {
    res.write(`data: ${JSON.stringify({ type: 'tool', ...data })}\n\n`);
  });
});

// REST endpoints
app.post('/api/chat', async (req, res) => {
  // Send message to agent
});

app.get('/api/sessions', async (req, res) => {
  // List saved sessions
});

app.post('/api/sessions/:id/load', async (req, res) => {
  // Load session
});
```

### Frontend Components

**Key React Components:**

1. **`ChatInterface.tsx`** - Main chat view
2. **`MessageList.tsx`** - Scrollable message list
3. **`MessageInput.tsx`** - Text input with send button
4. **`ToolExecutionCard.tsx`** - Shows tool usage
5. **`MultiAgentPipeline.tsx`** - Pipeline visualization
6. **`PipelineNode.tsx`** - Individual agent node
7. **`SettingsPanel.tsx`** - Configuration
8. **`SessionSidebar.tsx`** - Session management

**State Management:**

```typescript
// Using Zustand for global state
interface AgentStore {
  messages: Message[];
  activeTools: Tool[];
  activePipeline: Pipeline | null;
  settings: AgentSettings;

  sendMessage: (text: string) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AgentSettings>) => void;
}
```

### Multi-Agent Pipeline Visualization

**Using React Flow:**

```typescript
import ReactFlow, { Node, Edge } from 'reactflow';

interface AgentNode extends Node {
  data: {
    agentName: string;
    status: 'waiting' | 'running' | 'done' | 'error';
    progress: number;
    tools: string[];
  };
}

const PipelineVisualizer = ({ pipeline }: Props) => {
  const nodes: AgentNode[] = pipeline.agents.map((agent, i) => ({
    id: agent.id,
    position: { x: i * 200, y: 100 },
    data: {
      agentName: agent.name,
      status: agent.status,
      progress: agent.progress,
      tools: agent.tools,
    },
  }));

  const edges: Edge[] = pipeline.connections.map(conn => ({
    id: `${conn.from}-${conn.to}`,
    source: conn.from,
    target: conn.to,
    animated: conn.active,
  }));

  return <ReactFlow nodes={nodes} edges={edges} />;
};
```

---

## 📦 Project Structure

```
agent-sdk-ui/
├── src/
│   ├── app/                    # Next.js app (if using Next)
│   │   ├── api/               # API routes
│   │   ├── chat/              # Chat page
│   │   ├── pipeline/          # Pipeline view
│   │   └── settings/          # Settings page
│   │
│   ├── components/            # React components
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── pipeline/
│   │   │   ├── PipelineVisualizer.tsx
│   │   │   └── AgentNode.tsx
│   │   └── shared/
│   │       ├── Button.tsx
│   │       └── Card.tsx
│   │
│   ├── lib/                   # Shared utilities
│   │   ├── agent-client.ts   # API client
│   │   └── websocket.ts      # WebSocket/SSE handling
│   │
│   ├── stores/                # State management
│   │   └── agent-store.ts
│   │
│   └── types/                 # TypeScript types
│       └── agent.types.ts
│
├── public/                    # Static assets
├── package.json
└── tsconfig.json
```

---

## 🎯 Development Phases

### Phase 20.1: Basic Web UI (Week 1)
- ✅ Set up Next.js project
- ✅ Create basic chat interface
- ✅ Connect to agent backend (SSE)
- ✅ Display messages and responses
- ✅ Add session save/load

### Phase 20.2: Tool Visualization (Week 2)
- ✅ Show active tool executions
- ✅ Display tool results
- ✅ Add tool execution history
- ✅ Create expandable tool cards

### Phase 20.3: Multi-Agent Pipeline View (Week 3)
- ✅ Integrate React Flow
- ✅ Create pipeline visualization
- ✅ Real-time status updates
- ✅ Agent progress indicators
- ✅ Pipeline controls (pause/resume)

### Phase 20.4: Settings & Configuration (Week 4)
- ✅ Settings panel
- ✅ Model selection
- ✅ Feature toggles
- ✅ Limit configuration
- ✅ API key management

### Phase 20.5: Polish & Production (Week 5)
- ✅ Responsive design (mobile)
- ✅ Dark/light theme
- ✅ Error handling
- ✅ Loading states
- ✅ Deployment setup

---

## 🚀 Quick Start Commands

```bash
# Create new Next.js project for UI
npx create-next-app@latest agent-sdk-ui --typescript --tailwind --app

# Install dependencies
cd agent-sdk-ui
npm install zustand reactflow lucide-react @radix-ui/react-* class-variance-authority

# Install shadcn/ui components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input textarea

# Link to existing agent code
# Option 1: npm link (development)
cd ../agent_test && npm link
cd ../agent-sdk-ui && npm link agent-sdk-learning

# Option 2: Path alias in tsconfig
"paths": {
  "@agent/*": ["../agent_test/src/*"]
}
```

---

## 📊 Data Flow

```
┌─────────────┐
│   Browser   │
│   (React)   │
└──────┬──────┘
       │
       │ HTTP/SSE
       ▼
┌─────────────┐
│  Next.js    │
│  API Routes │
└──────┬──────┘
       │
       │ Import
       ▼
┌─────────────┐
│   Agent     │
│  (Existing) │
└──────┬──────┘
       │
       │ API Calls
       ▼
┌─────────────┐
│  Anthropic  │
│     API     │
└─────────────┘
```

---

## 🎨 Design System

**Colors:**
- Primary: Blue (`#3b82f6`)
- Success: Green (`#10b981`)
- Warning: Yellow (`#f59e0b`)
- Error: Red (`#ef4444`)
- Background: White/Dark (`#ffffff` / `#0a0a0a`)

**Typography:**
- Font: Inter or Geist Sans
- Headings: font-semibold
- Body: font-normal
- Code: font-mono

**Components:**
- Use shadcn/ui for consistency
- Tailwind for styling
- Lucide React for icons

---

## 🔐 Security Considerations

1. **API Key Storage**
   - Store in environment variables
   - Never expose in frontend code
   - Use server-side API routes only

2. **Session Management**
   - Implement proper session tokens
   - Rate limiting on API endpoints
   - CSRF protection

3. **Input Validation**
   - Sanitize user inputs
   - Validate message length
   - Prevent injection attacks

---

## 🎯 Success Criteria

Phase 20 is complete when:
- ✅ Web UI runs locally
- ✅ Can send messages and get responses
- ✅ Tool executions are visible
- ✅ Multi-agent pipelines are visualized
- ✅ Settings can be configured
- ✅ Sessions can be saved/loaded
- ✅ Responsive on mobile
- ✅ Production-ready deployment

---

## 📚 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Flow](https://reactflow.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

## 🤔 Open Questions

1. Should we use WebSocket or SSE for real-time communication?
   - **Recommendation**: SSE (simpler, one-way, good for streaming)

2. Deploy as separate apps or monorepo?
   - **Recommendation**: Monorepo with Turborepo

3. Mobile app needed?
   - **Recommendation**: PWA first, native later if needed

4. Authentication required?
   - **Recommendation**: Optional, add in Phase 20.6

---

**Next Steps:**
1. Review this plan
2. Choose tech stack (recommend Next.js)
3. Create initial UI project
4. Start with Phase 20.1 (Basic Web UI)
