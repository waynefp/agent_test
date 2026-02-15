# Google Drive MCP Tool Discovery

## Available Tool We Know About
- ✅ `mcp__gdrive__search` - Search for files in Google Drive

## Tools We Need to Find
We need to discover if these tools exist (common in Google Drive MCPs):

1. **Upload/Create File**
   - `mcp__gdrive__upload`
   - `mcp__gdrive__create`
   - `mcp__gdrive__write`
   - `mcp__gdrive__create_file`

2. **Create Folder**
   - `mcp__gdrive__create_folder`
   - `mcp__gdrive__mkdir`

3. **List Files**
   - `mcp__gdrive__list`
   - `mcp__gdrive__list_files`

4. **Read File**
   - `mcp__gdrive__read`
   - `mcp__gdrive__get`

## Test Commands

### Test 1: Search (We know this works)
Try: "Search my Google Drive for files named 'test'"

### Test 2: Create a Test File
Try: "Create a text file in my Google Drive called 'test.txt' with content 'Hello from Agent SDK'"

### Test 3: Create a Folder
Try: "Create a folder in my Google Drive called 'Agent SDK Test'"

### Test 4: List Files
Try: "List the files in my Google Drive"

## What to Do Next

1. Try each test command above in this conversation
2. I'll see which MCP tools get called
3. We'll update the `google-drive-sync.ts` implementation with the correct tool names
4. Then we can test the `/sync-gdrive` command!

Ready to test?
