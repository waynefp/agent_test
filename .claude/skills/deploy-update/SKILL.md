# Deploy Update - Agent SDK VPS Updates via CI/CD

Simplified workflow for deploying updates to the Agent SDK on VPS using GitHub Actions and prebuilt Docker images.

## What This Skill Does

Walks you through updating the deployed agent on the VPS using the CI/CD pipeline. Makes deployment as simple as: **push code → wait → update**.

## When to Use

- Deploying new features to the VPS
- Adding new tools to the agent
- Updating dependencies or configurations
- Any code changes that need to go live

---

## ⚠️ FIRST TIME SETUP (One-Time Only)

**If you just switched from build-on-VPS to CI/CD**, you need to replace the docker-compose.yml on the VPS **once**:

### Tell Kodee:

> "Please replace the docker-compose.yml for agent-test-v2 with the latest version from GitHub:
>
> https://raw.githubusercontent.com/waynefp/agent_test/main/docker-compose.yml
>
> Then pull the latest image and recreate the container."

### After Kodee Updates:

**IMPORTANT:** You'll need to re-add your environment variables (API keys):

1. Kodee will ask for the `.env` file or environment variables
2. Provide:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   PERPLEXITY_API_KEY=pplx-your-key-here
   ```

**That's it!** After this one-time setup, future updates use the simple process below.

---

## Quick Update Process (The Simple Version)

### Step 1: Push Your Changes

```bash
# Make your code changes
# ... edit files ...

# Commit and push
git add .
git commit -m "feat: Add awesome new feature"
git push
```

### Step 2: Wait for Build (2-3 minutes)

Watch GitHub Actions build your image:
- Go to: https://github.com/waynefp/agent_test/actions
- Wait for green checkmark ✅
- Image is automatically pushed to: `ghcr.io/waynefp/agent_test:latest`

### Step 3: Update VPS

**Tell Kodee (Hostinger bot):**

> "Please run these commands for agent-test-v2:
> ```
> cd /docker/agent-test-v2
> docker compose pull
> docker compose up -d
> ```"

**Or via Docker Manager UI:**
- Go to Docker Manager
- Find agent-test-v2
- Click "Update"

**Or if you have SSH access:**

```bash
ssh your-user@148.230.82.242
cd /docker/agent-test-v2
docker compose pull
docker compose up -d
docker compose logs -f agent-test-v2
```

**Note:** If environment variables (API keys) disappear after updates, you may need to re-add them. This shouldn't happen if the `.env` file is properly configured. If it keeps happening, ask Kodee: "Why do environment variables need to be re-added each time? The .env file should persist across updates."

### Step 4: Verify

```bash
# Test health endpoint
curl http://148.230.82.242:3000/health

# Test chat endpoint
curl -X POST http://148.230.82.242:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","session_id":"test"}'
```

✅ **Done!** That's the whole process.

---

## How It Works (Understanding the Pipeline)

### The CI/CD Workflow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌─────────┐
│  git push   │ ───> │ GitHub       │ ───> │   GHCR      │ ───> │   VPS   │
│   to main   │      │   Actions    │      │  Registry   │      │  pulls  │
└─────────────┘      └──────────────┘      └─────────────┘      └─────────┘
                      (builds image)        (stores image)       (runs it)
```

**Components:**
1. **GitHub Actions** (`.github/workflows/docker-build.yml`)
   - Triggers on every push to `main` branch
   - Builds Docker image using your Dockerfile
   - Runs in Ubuntu environment (consistent builds)

2. **GitHub Container Registry** (GHCR)
   - Free for public repos
   - Stores built Docker images
   - URL: `ghcr.io/waynefp/agent_test:latest`

3. **VPS Docker Compose** (`docker-compose.yml`)
   - Uses `image:` instead of `build:`
   - Pulls prebuilt image from GHCR
   - No build step on VPS = faster deployments

### Why This Is Better

**Before (build-on-VPS):**
- VPS clones repo and builds (slow, unreliable)
- Docker Manager couldn't reliably update
- Build failures harder to debug
- Inconsistent build environments

**After (CI/CD with prebuilt images):**
- ✅ Fast VPS updates (just pulls image)
- ✅ Reliable (consistent build environment)
- ✅ Easy debugging (build logs in GitHub)
- ✅ Recommended by Hostinger for production

---

## Common Scenarios

### Scenario 1: Add a New Tool

```bash
# 1. Edit src/server.ts
# Add: import { createNewTool } from './tools/definitions/NewTool.js';
# Add to tools array: createNewTool(),

# 2. Update system prompt to mention new tool

# 3. Commit and push
git add src/server.ts
git commit -m "feat: Add NewTool for X functionality"
git push

# 4. Wait for GitHub Actions (check: https://github.com/waynefp/agent_test/actions)

# 5. Tell Kodee: "Update agent-test-v2 to pull latest image"

# 6. Test
curl -X POST http://148.230.82.242:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What tools do you have?","session_id":"test"}'
```

### Scenario 2: Update Dependencies

```bash
# 1. Update package.json
npm install new-package

# 2. Commit changes (including package-lock.json)
git add package.json package-lock.json
git commit -m "chore: Add new-package dependency"
git push

# 3-6: Same as above
```

### Scenario 3: Fix a Bug

```bash
# 1. Fix the code
# ... make changes ...

# 2. Test locally first
PORT=8080 npm run server
# ... test with curl ...

# 3. Commit and push
git add .
git commit -m "fix: Resolve issue with X"
git push

# 4-6: Same as above
```

---

## Troubleshooting

### GitHub Action Fails

**Problem:** Red X instead of green checkmark in Actions

**Solution:**
1. Click on the failed action
2. Read the build logs
3. Common issues:
   - TypeScript compilation errors
   - Missing dependencies
   - Docker build errors
4. Fix the issue locally
5. Push again (triggers new build)

### VPS Can't Pull Image

**Problem:** Kodee says "image pull failed" or similar

**Possible causes:**
- Image isn't public (check GitHub package settings)
- Wrong image name in docker-compose.yml
- Network issue

**Solution:**
```bash
# Verify image exists and is public
# Go to: https://github.com/waynefp/agent_test/pkgs/container/agent_test

# Check if image is set to public
# Settings → Packages → agent_test → Package settings → Change visibility → Public

# Retry pull manually (if you have SSH):
docker pull ghcr.io/waynefp/agent_test:latest
```

### Container Starts But Agent Doesn't Work

**Problem:** Container runs but API returns errors

**Solution:**
```bash
# Check logs for errors
docker compose logs -f agent-test-v2

# Common issues:
# - Missing ANTHROPIC_API_KEY in .env
# - Tool import errors
# - Runtime exceptions

# Check environment variables
docker compose exec agent-test-v2 env | grep ANTHROPIC

# Restart container
docker compose restart agent-test-v2
```

### New Tool Not Showing Up

**Problem:** Added tool but agent doesn't list it

**Checklist:**
- ✅ Tool imported in src/server.ts?
- ✅ Tool added to tools array?
- ✅ enableTools: true still set?
- ✅ GitHub Action succeeded?
- ✅ VPS pulled latest image?
- ✅ Container restarted?

**Debug:**
```bash
# Check which image version is running
docker compose ps
# Look for image: ghcr.io/waynefp/agent_test:latest

# Check image creation time
docker images | grep agent_test

# Force pull latest
docker compose pull
docker compose up -d
```

---

## Manual Build (Bypass CI)

If GitHub Actions is down or you need to test locally:

```bash
# Build image locally
docker build -t ghcr.io/waynefp/agent_test:test .

# Push to GHCR (requires login)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/waynefp/agent_test:test

# Update VPS docker-compose.yml to use :test tag temporarily
# image: ghcr.io/waynefp/agent_test:test
```

---

## Configuration Files

### GitHub Actions Workflow
**Location:** `.github/workflows/docker-build.yml`

**Triggers:**
- Push to `main` branch
- Manual trigger via GitHub UI

**What it does:**
1. Checkout code
2. Login to GHCR
3. Build Docker image
4. Tag with: `latest`, `main-<sha>`, branch name
5. Push to GHCR

### Docker Compose
**Location:** `docker-compose.yml`

**Key settings:**
```yaml
services:
  agent-api:
    image: ghcr.io/waynefp/agent_test:latest  # Prebuilt image
    container_name: agent-test-v2
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY:-}
    volumes:
      - agent-workspace:/app/workspace  # Persistent file storage
```

---

## Rollback to Previous Version

If latest deployment breaks something:

### Option 1: Use Previous Git SHA

```bash
# Find previous working commit
git log --oneline

# In GitHub Actions, tag is: main-<sha>
# Update docker-compose.yml:
image: ghcr.io/waynefp/agent_test:main-abc1234

# Pull and restart
docker compose pull
docker compose up -d
```

### Option 2: Revert Git Commit

```bash
# Revert to previous commit
git revert HEAD
git push

# Wait for GitHub Actions to build
# Update VPS (pulls reverted version)
```

---

## Environment Variables

**Required:**
- `ANTHROPIC_API_KEY` - Your Claude API key

**Optional:**
- `PERPLEXITY_API_KEY` - For web search tool
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: production)

**Where to set:**
- VPS: In `.env` file at `/docker/agent-test-v2/.env`
- Never commit `.env` to git!

**If API keys disappear after updates:**

The `.env` file should persist across updates. If you keep needing to re-add them:

1. **Via Kodee:** Ask to verify the `.env` file location and persistence
2. **Via SSH:** Create/verify `.env` file:
   ```bash
   cd /docker/agent-test-v2
   nano .env
   # Add:
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   PERPLEXITY_API_KEY=pplx-your-key-here
   # Save: Ctrl+X, Y, Enter

   # Verify it's there
   cat .env

   # Restart to pick up changes
   docker compose up -d
   ```

3. **Alternative:** Set via docker-compose.yml directly (less secure, but persists)

---

## Monitoring & Logs

### View Container Logs

```bash
# Live logs (Ctrl+C to exit)
docker compose logs -f agent-test-v2

# Last 100 lines
docker compose logs --tail=100 agent-test-v2

# Logs since timestamp
docker compose logs --since=2024-01-01T12:00:00 agent-test-v2
```

### Check Container Health

```bash
# Container status
docker compose ps

# Health check status
docker inspect agent-test-v2 | grep -A 10 Health

# Resource usage
docker stats agent-test-v2
```

### GitHub Actions Logs

Go to: https://github.com/waynefp/agent_test/actions
- Click on a workflow run
- View build logs
- Download logs if needed

---

## Quick Reference Commands

```bash
# === Local Development ===
npm run build                    # Build TypeScript
PORT=8080 npm run server         # Test locally

# === Git ===
git add .
git commit -m "feat: Add feature"
git push                         # Triggers CI build

# === GitHub Actions ===
# Check: https://github.com/waynefp/agent_test/actions

# === VPS (via Kodee) ===
# "Update agent-test-v2 to pull latest image"

# === VPS (via SSH) ===
docker compose pull              # Get latest image
docker compose up -d             # Recreate containers
docker compose logs -f           # View logs
docker compose restart           # Restart container
docker compose ps                # Check status

# === Testing ===
curl http://148.230.82.242:3000/health
curl -X POST http://148.230.82.242:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","session_id":"test"}'
```

---

## Success Checklist

After deploying an update:

- ✅ GitHub Action completed (green checkmark)
- ✅ Image pushed to GHCR
- ✅ VPS pulled latest image
- ✅ Container restarted successfully
- ✅ Health endpoint responds
- ✅ Chat endpoint works
- ✅ New features/tools functional
- ✅ n8n workflows still work

---

## Related Documentation

- Handoff Document: `HANDOFF-VPS-DEPLOYMENT.md`
- Docker Deployment Guide: `DOCKER-DEPLOYMENT.md`
- GitHub Actions Workflow: `.github/workflows/docker-build.yml`
- Docker Compose: `docker-compose.yml`

---

## The "Pain" Scale 📊

**Before (build-on-VPS):** 😫😫😫😫😫 (10/10 pain)
- Clone repo on VPS
- Debug build failures
- Pray it works
- Repeat 5 times

**After (CI/CD):** 😊 (2/10 pain)
- git push
- Wait 2 minutes
- "Update agent-test-v2"
- Done

**Worth it?** Absolutely! 🎉

---

*End of Skill*
*Use `/deploy-update` to invoke this skill*
