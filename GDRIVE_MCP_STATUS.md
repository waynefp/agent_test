# Google Drive MCP - Current Status

**Date**: 2026-02-14
**Status**: ❌ Not Working (Tools Not Loading)

## Summary

The Google Drive MCP is **configured correctly** and **authenticated**, but its tools are **not appearing** in Claude Code.

## What's Working ✅

1. **MCP Package Installed**: `@piotr-agier/google-drive-mcp` v1.1.2 runs successfully
2. **OAuth Credentials**: File exists at `C:\Users\suzbp\.config\google-drive-mcp\gcp-oauth.keys.json`
3. **Authentication Tokens**: File exists at `C:\Users\suzbp\.config\google-drive-mcp\tokens.json`
4. **Claude Code MCP System**: Other MCPs (Notion, Vercel) work fine
5. **Configuration**: `.claude/mcp.json` has correct gdrive entry

## What's NOT Working ❌

**Google Drive MCP tools are not appearing in Claude Code's available tools.**

Expected tools (not found):
- `mcp__gdrive__createTextFile`
- `mcp__gdrive__createFolder`
- `mcp__gdrive__search`
- `mcp__gdrive__listFolder`

Comparison with working MCPs:
- ✅ `mcp__claude_ai_Notion__notion-fetch` - Working
- ✅ `mcp__claude_ai_Vercel__search_vercel_documentation` - Working
- ❌ `mcp__gdrive__*` - NOT appearing

## Root Cause Analysis

Since other MCPs work but Google Drive doesn't, the issue is specific to the `gdrive` MCP configuration or startup.

**Possible causes**:
1. **MCP server startup failure** - Claude Code tries to start it but it fails silently
2. **Invalid MCP response** - The gdrive MCP doesn't respond correctly to tool list requests
3. **Protocol mismatch** - The MCP might use an incompatible MCP protocol version
4. **Path/permissions issue** - The MCP can't access required files when started by Claude Code

## Configuration Details

### .claude/mcp.json
```json
{
  "gdrive": {
    "command": "npx",
    "args": ["-y", "@piotr-agier/google-drive-mcp"],
    "env": {
      "GOOGLE_DRIVE_OAUTH_CREDENTIALS": "C:\\Users\\suzbp\\.config\\google-drive-mcp\\gcp-oauth.keys.json"
    }
  }
}
```

### Files Present
```
C:\Users\suzbp\.config\google-drive-mcp\
├── gcp-oauth.keys.json (411 bytes, Feb 12)
├── gcp-oauth-mymcp.keys.json (408 bytes, Feb 13)
└── tokens.json (728 bytes, Feb 13)
```

## Next Steps

### Option 1: Check Claude Code MCP Logs
Look for startup errors or warnings about the gdrive MCP. Claude Code may log why it failed to load the tools.

**Action**: Check Claude Code console/logs for "gdrive" or "google-drive-mcp" errors

### Option 2: Test MCP Manually
Start the MCP server manually and test if it responds to MCP protocol messages.

**Action**:
```bash
# Set the env variable
export GOOGLE_DRIVE_OAUTH_CREDENTIALS="C:\Users\suzbp\.config\google-drive-mcp\gcp-oauth.keys.json"

# Start the MCP server
npx -y @piotr-agier/google-drive-mcp start

# Send MCP "list tools" request via stdin
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx -y @piotr-agier/google-drive-mcp start
```

### Option 3: Try Alternative MCP Package
Search for other Google Drive MCP implementations that might work better with Claude Code.

**Action**: Search npm for "google-drive mcp" alternatives

### Option 4: Direct API Integration
Instead of using MCP, implement Google Drive upload directly in our code using the `googleapis` package.

**Pros**:
- Full control over implementation
- No dependency on MCP
- Can customize exactly what we need

**Cons**:
- More code to write
- Need to handle OAuth ourselves
- Can't use declarative MCP approach

### Option 5: Use Notion as Intermediary
Since Notion MCP works and has Google Drive integration, we could:
1. Create Notion pages with our content
2. Use Notion's native Google Drive sync

**Pros**:
- Notion MCP confirmed working
- Gets content into ecosystem

**Cons**:
- Extra step (Notion → Google Drive)
- Not direct Google Drive access

## Recommended Approach

**Short-term**: Document the issue and file a bug report with the MCP maintainer
**Long-term**: Implement direct Google Drive API integration for full control

The direct API approach (Option 4) gives us:
- Reliable, tested solution
- Full control and customization
- No dependency on external MCP
- Learning opportunity for OAuth and Google APIs

## Files Created

1. **GDRIVE_MCP_TEST.md** - Test plan and tool discovery guide
2. **GDRIVE_MCP_TROUBLESHOOTING.md** - Detailed troubleshooting steps
3. **GDRIVE_MCP_STATUS.md** (this file) - Current status summary
4. **src/scripts/test-gdrive-mcp.ts** - Test script for MCP discovery
5. **src/utils/gdrive-mcp-wrapper.ts** - Wrapper (not yet functional)
6. **src/utils/google-drive-sync.ts** - Sync utility (not yet functional)

## Decision Point

**Do we**:
- A) Keep troubleshooting the MCP (file issue, wait for fix)
- B) Implement direct Google Drive API integration
- C) Use Notion as intermediary
- D) Document manual sync process

**Recommendation**: Go with **Option B** (direct API integration) because:
- We've already invested time in troubleshooting MCP
- Direct implementation gives us full control
- Good learning opportunity
- Reliable, doesn't depend on external MCP

Let me know which option you prefer!
