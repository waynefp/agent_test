# Deploy VPS - n8n Integration Server

Deploy the Agent SDK as an HTTP API server to a VPS for n8n workflow integration.

## What This Skill Does

Guides you through deploying the standalone Express server (`src/server.ts`) to a VPS, configuring it with PM2, exposing it via nginx, and testing integration with n8n workflows.

## When to Use

- Setting up the agent on a VPS for the first time
- Deploying updates after code changes
- Troubleshooting n8n integration issues
- Setting up a new n8n workflow that calls the agent

## Prerequisites

- VPS access (SSH credentials)
- Domain or VPS IP address
- ANTHROPIC_API_KEY
- Optional: PERPLEXITY_API_KEY for web search
- n8n instance (cloud or self-hosted)

## Local Testing First

**IMPORTANT:** Always test locally before deploying to VPS.

```bash
# 1. Build the server
npm run build

# 2. Verify dist/server.js was created
ls -lh dist/server.js

# 3. Test locally (use PORT=8080 to avoid conflict with web UI on port 3000)
PORT=8080 node dist/server.js &
SERVER_PID=$!

# 4. Test health endpoint
curl http://localhost:8080/health
# Expected: {"status":"ok","message":"Agent API Server is running"}

# 5. Test chat endpoint
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 2+2?", "session_id": "test"}'
# Expected: {"response":"...","session_id":"test"}

# 6. Cleanup
kill $SERVER_PID
```

## Phase 1: Initial VPS Setup

```bash
# SSH into VPS
ssh your-user@your-vps-ip

# Clone or update repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git agent-api
# OR if already exists:
cd agent-api && git pull

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
nano .env
# Add:
# ANTHROPIC_API_KEY=sk-ant-...
# PORT=3000
# PERPLEXITY_API_KEY=pplx-... (optional)

# Build the server
npm run build

# Verify build output
ls -lh dist/server.js
```

## Phase 2: PM2 Setup (Production Process Manager)

```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start the server with PM2
pm2 start dist/server.js --name 'agent-api'

# View logs
pm2 logs agent-api

# Check status
pm2 status

# Save PM2 configuration
pm2 save

# Setup PM2 to restart on server reboot
pm2 startup
# Run the command it outputs (usually sudo-based)

# Test locally on VPS
curl http://localhost:3000/health
```

## Phase 3: Expose the Endpoint

### Option A: Direct Port Access (Quick Testing)

1. Open port 3000 in VPS firewall (Hostinger panel or iptables)
2. Test from your local machine:
   ```bash
   curl http://YOUR_VPS_IP:3000/health
   ```
3. n8n URL: `http://YOUR_VPS_IP:3000/chat`

### Option B: Nginx Proxy (Recommended for Production)

Add to nginx config (usually `/etc/nginx/sites-available/default`):

```nginx
location /agent/ {
    proxy_pass http://localhost:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 120s;
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

Test from local machine:
```bash
curl http://YOUR_VPS_IP/agent/health
```

n8n URL: `http://YOUR_VPS_IP/agent/chat`

## Phase 4: n8n Workflow Integration

### Basic 3-Node Workflow

1. **Manual Trigger** (or Webhook/Schedule)
2. **HTTP Request** node:
   - Method: `POST`
   - URL: `http://YOUR_VPS_IP:3000/chat` (or `/agent/chat` if using nginx)
   - Body Content Type: `JSON`
   - Body:
     ```json
     {
       "message": "{{ $json.userMessage || 'Hello from n8n!' }}",
       "session_id": "{{ $json.sessionId || 'n8n-default' }}"
     }
     ```
3. **Set** node (optional - extract response):
   - `response`: `{{ $json.response }}`
   - `session_id`: `{{ $json.session_id }}`

### Test the Workflow

Execute with test data:
```json
{
  "userMessage": "What is the capital of France?",
  "sessionId": "test-workflow-1"
}
```

Expected output:
```json
{
  "response": "The capital of France is Paris...",
  "session_id": "test-workflow-1"
}
```

## Updating After Code Changes

```bash
# SSH into VPS
ssh your-user@your-vps-ip
cd agent-api

# Pull latest changes
git pull

# Rebuild
npm install  # Only if package.json changed
npm run build

# Restart PM2
pm2 restart agent-api

# Check logs for errors
pm2 logs agent-api --lines 50
```

## Troubleshooting

### Server won't start
```bash
# Check PM2 logs
pm2 logs agent-api

# Common issues:
# 1. Missing ANTHROPIC_API_KEY in .env
# 2. Port 3000 already in use (check: netstat -tlnp | grep 3000)
# 3. Build failed (re-run: npm run build)
```

### n8n gets 404 or connection refused
```bash
# 1. Verify server is running
pm2 status
curl http://localhost:3000/health

# 2. Check firewall rules
sudo ufw status

# 3. Test from VPS directly
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "session_id": "test"}'
```

### Tools not working (agent responds but doesn't search/calculate)
- **Root cause:** `enableTools: false` by default
- **Fix:** Already handled in `src/server.ts` (line 48: `enableTools: true`)
- **Verify:** Check server logs for tool usage indicators

### Session persistence issues
- **Note:** Sessions stored in-memory (Map) - lost on restart
- **For production:** Consider Redis or database-backed sessions
- **Temporary fix:** Use consistent session_id in n8n workflows

## Available Tools

The server includes:
- **web_search** - Perplexity (if PERPLEXITY_API_KEY set) or DuckDuckGo fallback
- **calculator** - Math expressions and unit conversions

To add more tools, edit `src/server.ts` and import from `src/tools/definitions/`.

## Security Notes

- **API Keys:** Never commit `.env` files
- **Rate Limiting:** Not implemented - consider adding for public APIs
- **CORS:** Currently allows all origins - restrict in production
- **HTTPS:** Use nginx with SSL/TLS certificates (Let's Encrypt)

## Cost Optimization

- **Model selection:** Server uses Sonnet by default (good balance)
- **Session cleanup:** Implement periodic cleanup of inactive sessions
- **Token limits:** Already set to 4096 max tokens per request
- **Monitoring:** Track usage with PM2 or external monitoring

## Related Documentation

- Full deployment guide: `Agent-Deployment-Guide.md`
- Server source code: `src/server.ts`
- Build configuration: `tsconfig.build.json`
- Package scripts: `package.json` (build, server)

## Success Criteria

✅ Local build succeeds (`npm run build`)
✅ Local server starts (`npm run server`)
✅ Health endpoint returns JSON
✅ Chat endpoint responds to messages
✅ VPS deployment via PM2 successful
✅ n8n workflow receives responses
✅ Tools execute when needed (search, calculator)
