# Docker Deployment Guide

Deploy the Agent SDK API server using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on VPS
- Git installed
- ANTHROPIC_API_KEY

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/waynefp/agent_test.git agent-api
cd agent-api

# Create environment file
cp .env.docker.example .env
nano .env
# Add your ANTHROPIC_API_KEY and optionally PERPLEXITY_API_KEY
```

### 2. Build and Run

```bash
# Build and start the container
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f agent-api
```

### 3. Test the Deployment

```bash
# Health check
curl http://localhost:3000/health

# Chat test
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! What tools do you have?", "session_id": "test"}'
```

## Management Commands

### View Logs
```bash
docker-compose logs -f agent-api
docker-compose logs --tail=100 agent-api
```

### Restart Container
```bash
docker-compose restart agent-api
```

### Stop Container
```bash
docker-compose stop
```

### Start Container
```bash
docker-compose start
```

### Rebuild After Code Changes
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Check logs for errors
docker-compose logs -f agent-api
```

### Complete Cleanup
```bash
# Stop and remove containers, networks
docker-compose down

# Also remove volumes (CAUTION: loses data)
docker-compose down -v
```

## Container Details

- **Image**: Built from `Dockerfile` (multi-stage Node.js 20 Alpine)
- **Port**: 3000 (host:container)
- **Restart Policy**: `unless-stopped` (auto-restart on failure)
- **Health Check**: Every 30s checks `/health` endpoint
- **Logs**: JSON file driver, max 10MB per file, 3 files retained

## Troubleshooting

### Container Keeps Restarting

```bash
# Check logs for errors
docker-compose logs --tail=50 agent-api

# Common issues:
# 1. Missing ANTHROPIC_API_KEY in .env
# 2. Build failed - check npm install/build errors
# 3. Port 3000 already in use
```

### Build Fails

```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port Already in Use

```bash
# Check what's using port 3000
netstat -tlnp | grep 3000

# Option 1: Stop the conflicting service
# Option 2: Change port in docker-compose.yml
#   ports:
#     - "8080:3000"  # Host port 8080 -> Container port 3000
```

### Environment Variables Not Working

```bash
# Verify .env file exists and has correct values
cat .env

# Restart to pick up changes
docker-compose down
docker-compose up -d
```

## Nginx Proxy Setup (Optional)

If using nginx as reverse proxy:

```nginx
location /agent/ {
    proxy_pass http://localhost:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 120s;
}
```

Then reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## n8n Integration

Use the Docker container's endpoint in n8n:

- **Internal** (if n8n is on same VPS): `http://agent-api:3000/chat`
- **External**: `http://YOUR_VPS_IP:3000/chat`
- **With nginx**: `http://YOUR_VPS_IP/agent/chat`

## Resource Monitoring

```bash
# Container resource usage
docker stats agent-api

# Detailed container info
docker inspect agent-api
```

## Security Notes

- Never commit `.env` files
- Use secrets management for production
- Consider adding rate limiting for public APIs
- Use HTTPS via nginx/Traefik reverse proxy
- Keep Docker and base images updated

## Updates and Maintenance

```bash
# Regular update workflow
cd agent-api
git pull
docker-compose up -d --build
docker-compose logs -f agent-api
```

## Multi-Container Stack

If you want to add Redis, monitoring, etc., extend `docker-compose.yml`:

```yaml
services:
  agent-api:
    # ... existing config
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    restart: unless-stopped
```
