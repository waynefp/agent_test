# Google Drive Sync - Setup Guide

## ✅ What's Been Implemented

1. **GoogleDriveSync Utility** (`src/utils/google-drive-sync.ts`)
   - Syncs learning guides, skills, and briefings
   - Converts .md files to .txt for Google Docs compatibility
   - Organized folder structure in Google Drive

2. **GDrive MCP Wrapper** (`src/utils/gdrive-mcp-wrapper.ts`)
   - Clean interface to Google Drive MCP tools
   - Ready to integrate once we discover tool names

3. **CLI Command** (`/sync-gdrive`)
   - `/sync-gdrive learning` - Sync all learning guides
   - `/sync-gdrive skills` - Sync all skills
   - `/sync-gdrive briefings` - Sync all briefings
   - `/sync-gdrive all` - Sync everything

4. **Folder Structure in Google Drive**:
   ```
   Agent SDK/
   ├── Learning Guides/
   │   ├── 01-foundation.txt
   │   ├── 19-parallel-tool-execution.txt
   │   └── ...
   ├── Skills/
   │   ├── briefing.txt
   │   ├── tts.txt
   │   └── ...
   └── Briefings/
       ├── 2026-02-13-AI-Longevity.txt
       └── ...
   ```

## 🔧 What Needs To Be Completed

We need to implement the actual MCP tool calls in `src/utils/gdrive-mcp-wrapper.ts`.

### Step 1: Discover MCP Tool Names

Your Google Drive MCP (piotr-agier/google-drive-mcp) provides these tools:
- `createTextFile`
- `createFolder`
- `search`
- `listFolder`

But we need to know the exact names as they're registered in Claude Code.

**To discover the tool names, please try this:**

In this conversation, ask me:
> "Create a text file in my Google Drive called 'test.txt' with content 'hello'"

When I attempt to do this, you'll see which MCP tool gets called in the logs/output. It will likely be one of:
- `mcp__google_drive__createTextFile`
- `mcp__gdrive__createTextFile`
- `mcp__piotr_agier__createTextFile`
- Or similar

### Step 2: Update the MCP Wrapper

Once we know the exact tool names, we'll update `src/utils/gdrive-mcp-wrapper.ts` to use them.

For example, if the tool is named `mcp__gdrive__createTextFile`, we'll replace:
```typescript
throw new Error('MCP Integration Needed...');
```

With:
```typescript
// Call the MCP tool (exact syntax depends on how MCP is integrated)
const result = await callMCPTool('mcp__gdrive__createTextFile', {
  name,
  content,
  parentFolderId: parentFolderId || null
});
return result.id;
```

### Step 3: Test the Sync

Once implemented, test with:
```bash
npm start
/sync-gdrive learning
```

This should upload all your learning guides to Google Drive!

## 📚 Current Status

- ✅ Utility classes created
- ✅ CLI command added
- ✅ Folder structure defined
- ⏳ MCP tool integration (needs tool name discovery)
- ⏳ Testing and validation

## 🎯 Next Steps

1. **Discover tool names** (try the test above)
2. **Implement MCP calls** in gdrive-mcp-wrapper.ts
3. **Test sync** with `/sync-gdrive all`
4. **Update workflows** to auto-sync new documents
5. **Create skill file** for future reference

## 📖 Sources

- [piotr-agier/google-drive-mcp GitHub](https://github.com/piotr-agier/google-drive-mcp)
- [npm package](https://www.npmjs.com/package/@piotr-agier/google-drive-mcp)

## 🎉 Ready to Test!

When you're ready, just say:
> "Create a text file in my Google Drive called 'test.txt' with content 'hello'"

And we'll see which tool gets called, then complete the integration!
