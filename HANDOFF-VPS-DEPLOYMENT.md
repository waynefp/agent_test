# Handoff: VPS Deployment & n8n Integration (2026-02-20/21)

## Executive Summary

Successfully deployed the Agent SDK as a standalone HTTP API server to a Hostinger VPS using Docker, with full n8n workflow integration working. The agent is now accessible via HTTP from anywhere and can be called by n8n workflows, web apps, mobile apps, or any HTTP client.

---

## What Was Accomplished

### 1. n8n Integration Server (src/server.ts)
Created a simplified Express API server specifically for n8n and external integrations:

**Key Features:**
- Session-based conversations using `Map<session_id, Agent>`
- Simple JSON endpoints: `/health` (GET) and `/chat` (POST)
- Tools explicitly enabled (`enableTools: true` - critical fix for default config)
- CORS enabled for cross-origin requests
- Port 3000 (use `PORT=8080` for local testing to avoid web UI conflict)

**Files Created:**
- `src/server.ts` - Main server implementation
- `tsconfig.build.json` - Build config that enables emit (overrides `noEmit: true`)
- Updated `package.json` scripts:
  - `npm run build` - Uses tsconfig.build.json
  - `npm run server` - Runs compiled dist/server.js

**Local Testing:**
```bash
PORT=8080 npm run server
curl http://localhost:8080/health
curl -X POST http://localhost:8080/chat -H "Content-Type: application/json" -d '{"message":"Hello","session_id":"test"}'
```

### 2. Docker Deployment Configuration

Created complete Docker setup for VPS deployment:

**Files Created:**
- `Dockerfile` - Multi-stage build (Node 20 Alpine)
  - Stage 1: Build TypeScript → JavaScript with devDependencies
  - Stage 2: Production runtime with minimal dependencies
  - Health check endpoint monitoring
  - Verbose logging and version tracking for debugging
- `docker-compose.yml` - Orchestration configuration
  - Container name: `agent-test-v2`
  - Port mapping: `3000:3000`
  - Auto-restart: `unless-stopped`
  - Health checks every 30s
  - Resource limits: 1 CPU, 1GB RAM
  - Logging with rotation
- `.dockerignore` - Excludes unnecessary files from build
  - **Critical:** Does NOT exclude `package-lock.json` (needed for npm ci)
- `.env.docker.example` - Environment variable template
- `DOCKER-DEPLOYMENT.md` - Complete deployment guide
- `VERSION` - Tracks commit hash for build verification

**Critical Fixes During Deployment:**
1. **.dockerignore bug** - Initially excluded `package-lock.json`, causing npm ci to fail
2. **package-lock.json** - Had to commit updated lock file
3. **Build caching** - Hostinger was using cached builds; added VERSION tracking
4. **Debug logging** - Added verbose output to diagnose build issues

### 3. VPS Deployment (Hostinger)

**Deployment Details:**
- **VPS IP:** 148.230.82.242
- **Project Name:** agent-test-v2 (Docker Compose project)
- **Container Name:** agent-test-v2
- **Repository:** https://github.com/waynefp/agent_test.git
- **Branch:** main
- **Compose File:** docker-compose.yml (repo root)

**Environment Variables Set:**
- `ANTHROPIC_API_KEY` - Required for Claude API
- `PERPLEXITY_API_KEY` - Optional for web search tool
- `PORT=3000` - Default port
- `NODE_ENV=production`

**Deployment Process:**
1. Hostinger Docker Manager clones from GitHub
2. Builds Docker image using Dockerfile
3. Starts container with docker-compose.yml
4. Exposes port 3000 publicly

**Current Status:**
- ✅ Container running
- ✅ Health endpoint: http://148.230.82.242:3000/health
- ✅ Chat endpoint: http://148.230.82.242:3000/chat (POST only)

### 4. n8n Integration

**Successfully Connected:**
- User created n8n workflow with Chat Trigger
- HTTP Request node calls agent API
- External connection working: `http://148.230.82.242:3000/chat`
- Internal Docker network connection not configured (containers not linked)

**n8n HTTP Request Node Configuration:**
- **Method:** POST
- **URL:** `http://148.230.82.242:3000/chat`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "message": "{{ $json.chatInput }}",
    "session_id": "n8n-chat"
  }
  ```

**Response Format:**
```json
{
  "response": "Agent's response text here...",
  "session_id": "n8n-chat"
}
```

### 5. Testing & Verification

**Successful Tests:**
```bash
# Health check
curl http://148.230.82.242:3000/health
# Response: {"status":"ok","message":"Agent API Server is running"}

# Basic chat
curl -X POST http://148.230.82.242:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","session_id":"test"}'
# Response: {"response":"Hello! 👋 How can I help...","session_id":"test"}

# Calculator tool
curl -X POST http://148.230.82.242:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is 25 times 47?","session_id":"test"}'
# Response: {"response":"25 times 47 equals **1,175**.","session_id":"test"}

# Tool listing
curl -X POST http://148.230.82.242:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What tools do you have?","session_id":"test-1"}'
# Response: Lists Web Search and Calculator tools
```

**Available Tools:**
- ✅ Web Search (Perplexity or DuckDuckGo fallback)
- ✅ Calculator (math operations)

---

## Important Technical Decisions

### 1. Why Two Servers?
- **`src/api/server.ts`** (Phase 20) - Web UI backend with SSE streaming
- **`src/server.ts`** (NEW) - n8n/external integrations with simple JSON

Different use cases require different architectures.

### 2. Docker vs PM2
Original plan was PM2 (simpler), but VPS uses Docker for all services.
Created proper Docker setup instead.

### 3. Port Configuration
- **Default:** 3000 (for VPS deployment)
- **Local testing:** Use `PORT=8080` to avoid conflict with web UI on port 3000
- Environment variable allows flexibility

### 4. CORS Enabled
Server accepts requests from any origin for maximum flexibility.
Can be restricted later for production security.

### 5. Session Storage
Currently uses in-memory `Map<session_id, Agent>`.
**Limitation:** Sessions lost on container restart.
**Future:** Could use Redis or database for persistence.

---

## File Structure Changes

```
agent-sdk-test/
├── src/
│   ├── server.ts              # NEW: n8n integration server
│   └── api/
│       └── server.ts          # Existing: Web UI backend
├── Dockerfile                 # NEW: Multi-stage Docker build
├── docker-compose.yml         # NEW: Container orchestration
├── .dockerignore              # NEW: Build context exclusions
├── .env.docker.example        # NEW: Environment template
├── tsconfig.build.json        # NEW: Build-specific TS config
├── DOCKER-DEPLOYMENT.md       # NEW: Docker deployment guide
├── VERSION                    # NEW: Commit hash tracking
└── package.json               # MODIFIED: Added build/server scripts
```

---

## Git Commits (Session Timeline)

1. `6200aff` - feat: Add n8n integration server for VPS deployment
2. `9f753b3` - docs: Add /deploy-vps skill for n8n VPS deployment
3. `1a195b9` - fix: Restore CORS and port 3000 default for VPS deployment
4. `4ca4bd9` - chore: Update container name to agent-test-v2
5. `a9ed9be` - fix: Update package-lock.json for Docker build
6. `a9c45b3` - fix: Remove package-lock.json from .dockerignore (needed for npm ci)
7. `795630a` - debug: Add verbose logging to Dockerfile build
8. `e44a66b` - debug: Add VERSION file to verify which commit is being built
9. `fbb3aa0` - chore: Update VERSION to current commit

---

## Known Issues & Limitations

### 1. Internal Docker Networking Not Configured
- n8n and agent containers not in same Docker network
- Currently using external IP (148.230.82.242:3000)
- **Future:** Configure shared Docker network for internal communication

### 2. Session Persistence
- Sessions stored in-memory (lost on restart)
- **Future:** Add Redis or database backend

### 3. No File Tools Yet
- Web Search and Calculator only
- **Next Task:** Add FileSystemTool

### 4. No Rate Limiting
- API is open without rate limits
- **Future:** Add rate limiting for production use

### 5. No HTTPS
- Currently HTTP only
- **Future:** Add nginx reverse proxy with SSL/TLS

---

## Skills Created

### /deploy-vps
Located: `.claude/skills/deploy-vps/SKILL.md`

Comprehensive deployment skill covering:
- Local testing workflow
- VPS setup with Docker
- n8n workflow integration
- Troubleshooting common issues
- Update/redeployment procedures

---

## Next Steps

### Immediate (Next Session)
1. **Add FileSystemTool** - Enable file read/write capabilities
   - Configure safe working directory
   - Security considerations for VPS file access
   - Update and redeploy

### Short Term
2. **Internal Docker Networking** - Link n8n and agent containers
3. **Session Persistence** - Add Redis for persistent sessions
4. **Monitoring** - Set up logging/monitoring for production

### Medium Term
5. **HTTPS/SSL** - Add nginx reverse proxy with Let's Encrypt
6. **Rate Limiting** - Protect API from abuse
7. **Additional Tools** - Add Memory, Task, or custom tools as needed

### Long Term
8. **Scaling** - Multiple container instances with load balancing
9. **CI/CD** - Automated deployment pipeline
10. **Metrics** - Usage tracking and analytics

---

## Testing Checklist for New Agent

When adding new tools or making changes:

1. ✅ Local build: `npm run build`
2. ✅ Local test: `PORT=8080 npm run server`
3. ✅ Test endpoints locally with curl
4. ✅ Commit and push changes
5. ✅ VPS: Pull latest code (`git pull`)
6. ✅ VPS: Rebuild container (`docker compose up -d --build`)
7. ✅ VPS: Check logs (`docker compose logs -f agent-test-v2`)
8. ✅ Test external endpoint: `http://148.230.82.242:3000/chat`
9. ✅ Test in n8n workflow
10. ✅ Verify new tools work correctly

---

## Key Learnings

1. **BusyBox Compatibility** - Alpine Linux uses BusyBox tools, not GNU tools
2. **.dockerignore Gotcha** - Excluding package-lock.json breaks npm ci
3. **Hostinger Caching** - Docker Manager may cache builds; VERSION file helps
4. **PowerShell vs Bash** - curl.exe syntax differs from Unix curl
5. **enableTools Critical** - Must explicitly set to true (default is false)
6. **Multi-stage Builds** - Keeps production image small (dev deps only in build stage)

---

## Reference Commands

### Local Development
```bash
# Build
npm run build

# Test locally (avoid port 3000 conflict)
PORT=8080 npm run server

# Test health
curl http://localhost:8080/health

# Test chat
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","session_id":"test"}'
```

### VPS Management
```bash
# SSH into VPS
ssh your-user@148.230.82.242

# Navigate to project
cd agent-api

# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build

# View logs
docker compose logs -f agent-test-v2

# Check container status
docker compose ps

# Restart container
docker compose restart agent-test-v2

# Stop container
docker compose down
```

### Testing Endpoints
```bash
# Health check
curl http://148.230.82.242:3000/health

# Chat (simple)
curl -X POST http://148.230.82.242:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","session_id":"test"}'

# Calculator
curl -X POST http://148.230.82.242:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is 50 plus 25?","session_id":"test"}'
```

---

## Success Metrics

✅ **Agent deployed** - Running on VPS in Docker
✅ **API accessible** - External HTTP requests working
✅ **Tools working** - Web Search and Calculator functional
✅ **n8n integrated** - Workflow successfully calling agent
✅ **Session management** - Multiple conversations tracked
✅ **Health monitoring** - Health check endpoint responding

---

## Contact Points

- **VPS IP:** 148.230.82.242
- **Health:** http://148.230.82.242:3000/health
- **Chat:** http://148.230.82.242:3000/chat (POST)
- **GitHub Repo:** https://github.com/waynefp/agent_test.git
- **Docker Project:** agent-test-v2
- **Container:** agent-test-v2

---

## Current State Summary

**Repository:** Up to date on main branch (commit `fbb3aa0`)
**VPS Deployment:** Running and verified working
**n8n Integration:** Connected and tested successfully
**Tools Available:** Web Search, Calculator
**Next Task:** Add FileSystemTool for file operations

---

*End of Handoff Document*
*Created: 2026-02-21*
*Session: VPS Deployment & n8n Integration*
