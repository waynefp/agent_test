# Session Handoff Document
**Date:** February 16, 2026
**Phase:** 20 - Web UI Development
**Status:** Backend architecture complete, chat debugging needed

---

## Quick Start

### Running the Project

**Backend API Server:**
```bash
cd Agent_SDK-Test
npm run api
# Runs on http://localhost:4000
```

**Frontend Web UI:**
```bash
cd Agent_SDK-Test/web-ui
npm run dev
# Runs on http://localhost:3000
```

**CLI Agent (still works):**
```bash
cd Agent_SDK-Test
npm run dev
# Interactive CLI with tools
```

**Daily Briefing:**
```bash
npm run briefing -- --topics="AI,Longevity"
# Generates reports in data/briefings/
```

---

## Project Overview

**Goal:** Build a reusable agent foundation with web UI that can be deployed to production (Vercel).

**Tech Stack:**
- **Backend:** Express + Agent SDK (TypeScript, Node.js)
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS
- **AI:** Anthropic Claude Sonnet 4 with streaming
- **Tools:** Web search (Perplexity), Google Trends, filesystem, etc.
- **Multi-agent:** Parallel, Chain, Supervisor patterns

---

## Current Architecture

### Backend (Port 4000)
```
src/api/
├── server.ts          # Express server with CORS
└── routes/
    └── chat.ts        # Chat endpoint with Agent + tools
```

**Purpose:**
- Expose Agent SDK via HTTP API
- No import/module resolution issues
- Deploy independently from frontend
- Production-ready architecture

### Frontend (Port 3000)
```
web-ui/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Chat interface
│   │   ├── pipeline/page.tsx           # Multi-agent visualization
│   │   ├── layout.tsx                  # Root layout with sidebar
│   │   └── api/
│   │       ├── chat/route.ts           # Proxies to backend
│   │       └── pipeline/run/route.ts   # Runs Daily Briefing CLI
│   └── components/
│       └── Sidebar.tsx                 # Navigation + quick actions
```

**Purpose:**
- Modern web interface for agent
- Sidebar with skills quick actions
- Multi-agent pipeline visualization
- Proxies chat to backend API

### Why Separate Backend?
1. **Import issues:** Next.js won't allow imports from parent directory
2. **Vercel deployment:** Frontend and backend deploy separately
3. **Clean separation:** Frontend (static) vs backend (compute)
4. **Same locally and production:** No architectural changes needed

---

## What's Working ✅

### 1. Daily Briefing Pipeline (FULLY WORKING)
- **UI:** http://localhost:3000/pipeline
- **Execution:** Runs real multi-agent pipeline via CLI
- **Duration:** ~120 seconds for full run
- **Output:**
  - Markdown report (`data/briefings/briefing-YYYY-MM-DD.md`)
  - TTS script (`data/briefings/briefing-YYYY-MM-DD.txt`)
  - Audio file (`data/briefings/briefing-YYYY-MM-DD.mp3`)
- **Agents:** 2 researchers + combiner + fact-checker + writer
- **Tools:** Perplexity web search, real research
- **TTS:** ElevenLabs (Carmelo La Rosa voice)

**Test it:**
```bash
# From UI:
1. Go to http://localhost:3000/pipeline
2. Enter topics: "AI Agents,Climate Tech"
3. Click "Run Pipeline"
4. Watch real-time progress
5. Check data/briefings/ for output files
```

### 2. Sidebar Navigation (WORKING)
- **Quick Actions** for skills:
  - Daily Briefing
  - Last 30 Days
  - Sync to Google Drive
  - Search Reddit
  - Search X/Twitter
- **Navigation** between Chat, Pipeline, Settings
- Clean, modern UI

### 3. Backend API Server (WORKING - Structure)
- Express server on port 4000
- Health check: http://localhost:4000/health
- CORS enabled for frontend
- 4 personas defined (Default, Researcher, Creative, Coder)
- SSE streaming setup

### 4. Basic Chat (WITHOUT TOOLS - WORKING)
- Simple conversation with Claude
- Streaming responses
- Conversation history
- No web search or tools

---

## What's NOT Working ❌

### Chat with Tools (CRITICAL BUG)

**Symptom:**
```
Error: messages.0.content.0.text.text: Input should be a valid string
```

**Location:** Backend API → Agent class → Anthropic API

**What happens:**
1. Frontend sends: `{ role: 'user', content: 'message string' }`
2. Backend receives it correctly
3. Agent class transforms it somehow
4. Anthropic API rejects with format error

**Root cause:** Agent class's message normalization is creating malformed structure

**Evidence:**
- Direct curl test to backend fails same way
- Error shows nested structure: `content.0.text.text` (wrong!)
- Should be: `content: [{ type: 'text', text: '...' }]`
- Or just: `content: 'string'`

**Why it matters:**
- Can't use web search or tools in chat
- Backend API architecture is sound, just this one bug
- CLI works fine (different code path?)

**Debug added:**
- Console.log in `src/api/routes/chat.ts` to show received data
- Need to trace through Agent.chat() to see transformation

**Next steps to debug:**
1. Check how CLI calls Agent.chat() - that works!
2. Compare with how API route calls it
3. Check Agent class message normalization code
4. May need to pass messages in different format
5. Or fix Agent.chat() to handle both formats

**Files to investigate:**
- `src/agent/Agent.ts` - Line 277 (where error thrown)
- `src/api/routes/chat.ts` - Line 45 (where agent.chat called)
- Compare with working examples in multi-agent code

---

## Architecture Decisions Made

### Decision 1: Monorepo Structure
**Why:** Keep UI and agent code together during development
**For Vercel:** Will deploy separately but share codebase

### Decision 2: Backend API Server
**Why:** Next.js can't import from parent directory
**Alternative rejected:** Copying code (maintenance nightmare)
**Result:** Clean architecture, production-ready

### Decision 3: Pipeline Runs CLI Script
**Why:** Import issues with multi-agent code
**Method:** `child_process.exec()` calls `npm run briefing`
**Works:** Files generated, TTS created, full pipeline executes

### Decision 4: Basic Chat Proxies to Backend
**Why:** Consistent architecture
**Current state:** Proxy works, but Agent.chat() has bug

---

## Important Files & Locations

### Agent SDK Core
- `src/agent/Agent.ts` - Main agent class ⚠️ Bug here
- `src/tools/` - Tool definitions (web search, etc.)
- `src/multi-agent/` - Multi-agent patterns

### Web UI
- `web-ui/src/app/page.tsx` - Chat interface
- `web-ui/src/app/pipeline/page.tsx` - Pipeline visualization
- `web-ui/src/components/Sidebar.tsx` - Navigation

### Backend API
- `src/api/server.ts` - Express server
- `src/api/routes/chat.ts` - Chat endpoint ⚠️ Calls buggy Agent.chat()

### Configuration
- `web-ui/.env.local` - Frontend env (has ANTHROPIC_API_KEY)
- `.env` - Backend env (has ANTHROPIC_API_KEY, PERPLEXITY_API_KEY, ELEVENLABS_API_KEY)
- `package.json` - Scripts (api, briefing, etc.)

### Output
- `data/briefings/` - Daily briefing reports with audio
- `web-ui/.next/` - Next.js build cache (can delete if issues)

---

## Environment Variables

**Backend (.env):**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
PERPLEXITY_API_KEY=pplx-...
ELEVENLABS_API_KEY=sk_e098724b7e32f3c9...
```

**Frontend (web-ui/.env.local):**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...  # Same key
NEXT_PUBLIC_API_URL=http://localhost:4000  # Optional, defaults to this
```

---

## Common Issues & Solutions

### Issue: "Module not found" in Next.js
**Cause:** Trying to import from parent directory
**Solution:** That's why we have separate backend API

### Issue: "Port 3000 in use"
**Solution:**
```bash
netstat -ano | findstr :3000
taskkill //F //PID <pid>
```

### Issue: Pipeline timeout
**Cause:** Timeout too short
**Current:** 180000ms (3 minutes) in `web-ui/src/app/api/pipeline/run/route.ts`
**If needed:** Increase further

### Issue: TTS fails
**Check:**
1. ELEVENLABS_API_KEY in .env
2. Voice ID: pWHqWjkaSNybDOvgMt58 (Carmelo La Rosa)
3. Look for Phase 4 in Daily Briefing output

### Issue: Dev server won't restart
**Solution:**
```bash
rm -rf web-ui/.next/dev/lock
pkill -f "next dev"
```

---

## Testing Checklist

**Before claiming "it works":**

- [ ] Backend health check: `curl http://localhost:4000/health`
- [ ] Frontend loads: http://localhost:3000
- [ ] Sidebar shows skills
- [ ] Navigate to Pipeline page
- [ ] Run Daily Briefing pipeline
- [ ] Pipeline completes (~120s)
- [ ] Files created in data/briefings/
- [ ] Audio file generated (.mp3)
- [ ] Chat interface loads
- [ ] Can send basic chat message (no tools)
- [ ] ⚠️ Chat with tools fails (known issue)

---

## Next Session Priorities

### Priority 1: Fix Chat with Tools Bug
**Time estimate:** 30-60 minutes
**Approach:**
1. Read Agent.ts to understand message normalization
2. Compare how CLI uses Agent.chat() vs API
3. Add debug logging to trace message transformation
4. Fix format issue in Agent class or API route
5. Test with web search

**Success criteria:**
- Ask "What's the latest AI news?" in chat
- See 🔧 tool usage indicator
- Get real search results with sources

### Priority 2: Image Upload for Chat
**Time estimate:** 20-30 minutes
**What to add:**
- File input in chat interface
- Convert image to base64
- Send to Anthropic with vision
- Display image thumbnail in chat

**Why it's easy:** Anthropic API supports vision, just need UI

### Priority 3: Persona Switcher
**Time estimate:** 15-20 minutes
**What to add:**
- Dropdown in sidebar
- Pass `persona` param to backend
- Backend already has 4 personas defined!
- Just needs UI component

**Files to edit:**
- `web-ui/src/components/Sidebar.tsx` - Add dropdown
- `web-ui/src/app/page.tsx` - Send persona in request
- Backend already handles it in `src/api/routes/chat.ts`

### Priority 4: Polish & Deploy
- Test on Vercel
- Environment variables setup
- Backend deployment (separate service or Vercel function)
- Documentation

---

## User Preferences & Context

**User is:**
- Learning AI agent development
- Interested in freelance/business applications
- Wants clean, educational code ("BEGINNER NOTE" style)
- Plans to deploy to Vercel
- Has API keys for Perplexity, ElevenLabs

**User has:**
- Daily Briefing working perfectly
- Google Drive sync for backups
- Multiple skills created (tts, mcp-setup, briefing, etc.)

**User wants:**
- Image upload in chat (vision)
- Persona switcher
- Full agent capabilities in web UI
- Production deployment

---

## Code Patterns to Follow

**Adding a new API route:**
```typescript
// Backend: src/api/routes/yourroute.ts
import express from 'express';
export const yourRouter = express.Router();

yourRouter.post('/', async (req, res) => {
  // SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.write(`data: ${JSON.stringify({ type: 'event' })}\n\n`);
  res.end();
});

// Server: src/api/server.ts
import { yourRouter } from './routes/yourroute.js';
app.use('/api/yourroute', yourRouter);
```

**Adding a new page:**
```typescript
// web-ui/src/app/yourpage/page.tsx
'use client'
export default function YourPage() {
  return <div>Content</div>
}

// Link from sidebar
<Link href="/yourpage">Your Page</Link>
```

**Calling backend from frontend:**
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'hi' })
});
// Frontend API routes proxy to backend
```

---

## Git & Deployment

**Current branch:** main
**Remote:** https://github.com/waynefp/agent_test.git
**Latest commit:** 99dc67d (Backend API architecture)

**Commit message format:**
```
feat: Brief description

Detailed explanation
- Bullet points for changes
- What works
- Known issues

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Before committing:**
- Exclude `.claude/settings.local.json` (local settings)
- Exclude `.env` and `.env.local` (secrets)
- Include `.env.example` (template)

---

## Critical Debugging Context

### Why Chat with Tools Fails

**The error message breakdown:**
```
messages.0.content.0.text.text: Input should be a valid string
         ^       ^    ^    ^
         |       |    |    |
         |       |    |    Fourth level (WRONG!)
         |       |    Third level property
         |       Content is array
         First message
```

**What Anthropic expects:**
```typescript
// Option 1: String content
{
  role: 'user',
  content: 'Hello'
}

// Option 2: Content blocks
{
  role: 'user',
  content: [
    { type: 'text', text: 'Hello' }
  ]
}
```

**What we're accidentally sending:**
```typescript
{
  role: 'user',
  content: [
    {
      text: {           // ❌ Nested object!
        text: 'Hello'   // ❌ Should be at parent level
      }
    }
  ]
}
```

**Where it breaks:**
The Agent class somewhere between receiving simple `{ role, content: string }` and sending to Anthropic is creating this nested structure.

**Hypothesis:**
Agent.chat() normalizes messages but has a bug where it double-wraps the text property.

---

## Questions for Next Session

1. **How does CLI call Agent.chat() successfully?**
   - Check src/index.ts or wherever CLI uses the agent
   - Copy that pattern to API route

2. **Can we bypass Agent.chat() normalization?**
   - Maybe call agent.agenticLoop() directly?
   - Or fix the normalization code?

3. **Should we update Agent class or work around it?**
   - If it's a bug, fix it (better long-term)
   - If it's API misuse, fix the API route

---

## Success Metrics

**Phase 20 will be complete when:**
- ✅ Daily Briefing runs from UI with TTS
- ✅ Backend API architecture deployed
- ✅ Sidebar navigation working
- ⏳ Chat with web search working
- ⏳ Image upload working
- ⏳ Persona switcher working
- ⏳ Deployed to Vercel

**We're at 60% completion!**

---

## Final Notes

**What went really well:**
- Daily Briefing integration is perfect
- Backend architecture is clean
- UI looks professional
- Sidebar provides great UX

**What to improve:**
- Need to fix Agent.chat() message format
- Need better error handling/logging
- Consider adding request ID tracking

**Technical debt:**
- Chat bug needs fixing before adding more features
- Consider adding tests for API routes
- Document persona system better

**Remember:**
The user wants to learn, so explain technical decisions and add "BEGINNER NOTE" comments for educational value!

---

## Quick Reference Commands

```bash
# Start everything
cd Agent_SDK-Test && npm run api &          # Backend
cd web-ui && npm run dev &                   # Frontend

# Run Daily Briefing
npm run briefing -- --topics="AI,Longevity"

# Test backend directly
curl http://localhost:4000/health
curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Kill stuck processes
pkill -f "tsx src/api/server.ts"
pkill -f "next dev"

# Clean rebuild
cd web-ui && rm -rf .next node_modules && npm install
```

---

**Ready for next session!** 🚀
