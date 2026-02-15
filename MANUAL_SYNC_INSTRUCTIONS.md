# Manual Google Drive Sync - Instructions

Since MCP tools are available to Claude but not directly callable from TypeScript, here's how to sync your documents:

## Option 1: Ask Claude to Upload (Recommended)

### For Learning Guides

Ask me in this conversation:

> "Please upload all my learning guides to Google Drive:
> - Create a folder structure: Agent SDK/Learning Guides/
> - Convert each .md file to .txt
> - Upload these files: [I'll list them]"

### For Skills

> "Please upload all my skills to Google Drive:
> - Create folder: Agent SDK/Skills/
> - Convert SKILL.md files to .txt with the skill name
> - Upload: briefing.txt, tts.txt, mcp-setup.txt, agent-test.txt"

## Option 2: Use the Batch Upload Script

1. Run the TypeScript script to prepare files:
```bash
npm run sync-prepare
```

2. This will output file contents and paths
3. Then ask me to upload them all at once

## Option 3: Implement Direct MCP Integration

We need to create a bridge between Node.js and Claude's MCP tools. This requires:

1. Creating a local server that accepts upload requests
2. Having Claude listen to that server and execute MCPs
3. More complex but fully automated

## Quick Test

Try asking me right now:

> "Create a text file in my Google Drive in the folder 'Agent SDK/Test' called 'integration-test.txt' with this content:
>
> # Integration Test
>
> This file was created by the Agent SDK Google Drive sync system.
> Created: [current date/time]
>
> If you can see this file, the integration is working! ✅"

If that works, we know the MCP is functional and we can proceed with batch uploads!

## Next Steps

Once we confirm the MCP works:
1. ✅ I'll upload all your learning guides
2. ✅ I'll upload all your skills
3. ✅ I'll upload any briefings
4. ✅ We'll set up auto-sync for future documents

Ready to test?
