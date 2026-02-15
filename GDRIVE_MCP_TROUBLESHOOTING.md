# Google Drive MCP Troubleshooting

## Issue Discovered
**Date**: 2026-02-14
**Problem**: Google Drive MCP tools are not available in Claude Code, despite being configured in `.claude/mcp.json`

## What We've Tried

### 1. ✅ MCP Configuration Check
```json
// .claude/mcp.json
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
**Status**: Configuration file exists and looks correct

### 2. ❌ Tool Search Results
Searched for Google Drive MCP tools using multiple queries:
- `"gdrive"` - No results
- `"google drive"` - Only Notion tools (with Google Drive integration)
- `"piotr agier"` - No results
- `"mcp create file"` - Only Notion/Vercel tools

**Status**: Google Drive MCP tools are NOT appearing in available tools

### 3. ❌ MCP Resources Check
Checked for MCP resources from the gdrive server:
```
ListMcpResourcesTool(server: "gdrive")
```
**Result**: "No resources found"

## Possible Causes

### 1. MCP Server Not Started
The MCP server might not be running. Claude Code MCPs are started on-demand when their tools are first needed, but the gdrive MCP might not have started properly.

**Symptoms**:
- Tools not appearing in tool search
- No resources available
- No error messages

### 2. OAuth Credentials Issue
The Google Drive MCP requires OAuth credentials at:
```
C:\Users\suzbp\.config\google-drive-mcp\gcp-oauth.keys.json
```

**To check**:
```bash
# Does the file exist?
ls "C:\Users\suzbp\.config\google-drive-mcp\gcp-oauth.keys.json"

# Is it valid JSON?
cat "C:\Users\suzbp\.config\google-drive-mcp\gcp-oauth.keys.json"
```

### 3. Package Not Installed
The MCP uses `npx -y @piotr-agier/google-drive-mcp`, which should auto-install. But network issues or package problems could prevent this.

**To check**:
```bash
# Try running the MCP manually
npx -y @piotr-agier/google-drive-mcp
```

### 4. MCP Protocol Version Mismatch
The Google Drive MCP might be using a different MCP protocol version than Claude Code expects.

### 5. Tool Registration Issue
The MCP might be running but not properly registering its tools with Claude Code.

## Troubleshooting Steps

### Step 1: Verify OAuth Credentials File Exists
```bash
ls "C:\Users\suzbp\.config\google-drive-mcp\gcp-oauth.keys.json"
```

**Expected**: File exists and contains valid OAuth credentials
**If missing**: Need to set up Google Cloud OAuth credentials (see piotr-agier/google-drive-mcp README)

### Step 2: Test MCP Package Installation
```bash
# Try to run the MCP manually
npx -y @piotr-agier/google-drive-mcp

# Or install it globally first
npm install -g @piotr-agier/google-drive-mcp
```

**Expected**: Package downloads and runs
**If fails**: Check network connection, npm registry access

### Step 3: Check Claude Code MCP Logs
Look for MCP-related logs or errors:
- Check Claude Code console output
- Look for error messages about "gdrive" MCP
- Check if MCP server process started

### Step 4: Restart Claude Code
Sometimes MCPs need a fresh start:
1. Exit Claude Code completely
2. Restart with `claude`
3. Try to use Google Drive functionality again

### Step 5: Manual MCP Test
Create a minimal test to see if the MCP works at all:
```bash
# Run the MCP in stdio mode and test it manually
npx -y @piotr-agier/google-drive-mcp
```

Then send test JSON-RPC messages to see if it responds.

### Step 6: Check MCP Package Documentation
Visit the official repo for setup instructions:
- GitHub: https://github.com/piotr-agier/google-drive-mcp
- NPM: https://www.npmjs.com/package/@piotr-agier/google-drive-mcp

Verify we followed all setup steps correctly.

## Expected MCP Tools

According to the piotr-agier/google-drive-mcp documentation, these tools should be available:

1. **createTextFile** - Create a text file in Google Drive
   - Parameters: name, content, parentFolderId (optional)
   - Returns: file ID

2. **createFolder** - Create a folder in Google Drive
   - Parameters: name, parentFolderId (optional)
   - Returns: folder ID

3. **search** - Search for files/folders
   - Parameters: query, parentFolderId (optional)
   - Returns: list of matching files

4. **listFolder** - List contents of a folder
   - Parameters: folderId
   - Returns: list of items

In Claude Code, they might be prefixed like:
- `mcp__gdrive__createTextFile`
- `mcp__gdrive__createFolder`
- etc.

## Next Steps

### Immediate Actions
1. **Verify OAuth credentials exist** (Step 1)
2. **Test MCP package installation** (Step 2)
3. **Check Claude Code logs for errors**

### If Still Not Working
1. **Try alternative Google Drive integration**:
   - Use Notion's Google Drive integration (we have Notion MCP working)
   - Use Google Drive API directly in our code
   - Use a different Google Drive MCP package

2. **Report issue**:
   - File issue on piotr-agier/google-drive-mcp GitHub
   - Check for existing issues about Claude Code compatibility

3. **Implement manual sync**:
   - Create scripts that use Google Drive API directly
   - Upload files via browser/manual process
   - Document the manual workflow

## Alternative Approaches

### Option A: Use Notion Integration
Notion MCP is working and has Google Drive integration. We could:
1. Create Notion pages with our content
2. Use Notion's Google Drive sync to sync to Drive
3. More complex but proven to work

### Option B: Direct API Implementation
Implement Google Drive upload directly in our code:
1. Use `googleapis` npm package
2. Implement OAuth flow
3. Create upload functions in `src/utils/`
4. More work but full control

### Option C: Manual Sync Process
Document a manual sync workflow:
1. Export files to local directory
2. User manually uploads to Google Drive
3. Simple but requires manual steps

## Status

**Current Status**: ❌ Google Drive MCP tools not available
**Blocker**: Need to troubleshoot why MCP isn't exposing tools
**Next Action**: Run troubleshooting Step 1 (verify OAuth credentials)

## References

- [piotr-agier/google-drive-mcp GitHub](https://github.com/piotr-agier/google-drive-mcp)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Claude Code MCP Documentation](https://docs.anthropic.com/claude/docs/mcp)
