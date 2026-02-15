# Google Drive Sync Skill

Sync Agent SDK documents (learning guides, skills, briefings) to Google Drive for easy access from any device.

## When to Use

- After creating new learning guides or documentation
- When you want to access your materials on mobile/other devices
- To backup your work to the cloud
- After completing a new skill or briefing

## Prerequisites

✅ Google Drive API authenticated (one-time setup)

If not authenticated yet:
```bash
npm run auth:gdrive
```

Follow the prompts to authorize and save tokens.

## Commands

### Sync Specific Content

```bash
# Start the agent
npm run dev

# In the agent CLI:
/sync-gdrive learning    # Sync all learning guides
/sync-gdrive skills      # Sync all skills
/sync-gdrive briefings   # Sync all briefings
/sync-gdrive all         # Sync everything
```

### Test Integration

```bash
npm run test:gdrive      # Test Google Drive API
```

### Re-authenticate (if tokens expire)

```bash
npm run auth:gdrive      # Get new OAuth tokens
```

## What Gets Synced

### Learning Guides → `Agent SDK/Learning Guides/`
- All `.md` files from `learning/` directory
- Converted to `.txt` for Google Docs compatibility
- Example: `learning/01-foundation.md` → `01-foundation.txt`

### Skills → `Agent SDK/Skills/`
- All `SKILL.md` files from `.claude/skills/`
- Named after skill folder
- Example: `.claude/skills/briefing/SKILL.md` → `briefing.txt`

### Briefings → `Agent SDK/Briefings/`
- All files from `output/briefings/`
- Uploaded as-is
- Example: `2026-02-13-AI-Longevity.txt`

## How It Works

1. **Reads local files** - Finds all matching documents
2. **Converts .md to .txt** - For Google Docs compatibility
3. **Creates folder structure** - `Agent SDK/Learning Guides/` etc.
4. **Uploads to Google Drive** - Uses Google Drive API v3
5. **Reports results** - Shows uploaded/failed files

## Folder Structure in Google Drive

```
Agent SDK/
├── Learning Guides/
│   ├── 01-foundation.txt
│   ├── 02-...txt
│   └── 19-parallel-tool-execution.txt
├── Skills/
│   ├── briefing.txt
│   ├── tts.txt
│   ├── mcp-setup.txt
│   ├── agent-test.txt
│   └── gdrive-sync.txt
└── Briefings/
    └── (briefing files)
```

## Troubleshooting

### "unauthorized_client" Error
**Cause**: Tokens expired or not authenticated
**Fix**:
```bash
npm run auth:gdrive
```

### "File not found" Error
**Cause**: No files in specified directory
**Fix**: Make sure you have files to sync (e.g., files in `learning/`)

### Files Not Appearing in Drive
**Cause**: May take a few seconds to sync
**Fix**: Refresh Google Drive web interface, check folder path

### Duplicate Files
**Cause**: Running sync multiple times creates new files
**Fix**: Manually delete duplicates in Google Drive (we don't auto-update existing files yet)

## Authentication Details

### OAuth Credentials Location
```
C:\Users\suzbp\.config\google-drive-mcp\gcp-oauth.keys.json
```

### Tokens Location
```
C:\Users\suzbp\.config\google-drive-mcp\tokens.json
```

### Required Scopes
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/drive`

## Tips

- **First time**: Run `npm run test:gdrive` to verify setup
- **Regular use**: Use `/sync-gdrive all` to sync everything at once
- **Mobile access**: Install Google Drive app to access synced files
- **Automation**: Can be added to git hooks or scheduled tasks

## Implementation

Uses direct Google Drive API v3 integration via `googleapis` package:
- `src/utils/gdrive-api-service.ts` - API service
- `src/utils/google-drive-sync.ts` - Sync utility
- `src/scripts/gdrive-auth.ts` - Authentication helper
- `src/scripts/test-gdrive-api.ts` - Test suite

## Examples

### First Time Setup
```bash
# 1. Authenticate
npm run auth:gdrive

# 2. Test
npm run test:gdrive

# 3. Sync everything
npm run dev
/sync-gdrive all
```

### Regular Usage
```bash
npm run dev
/sync-gdrive learning
```

### After Creating New Skill
```bash
npm run dev
/sync-gdrive skills
```

## Related Commands

- `/help` - Show all available commands
- See `COMMANDS_REFERENCE.md` for complete command list

## Notes

- Files are converted from `.md` to `.txt` for better Google Docs compatibility
- Sync creates new files each time (doesn't update existing ones)
- You can manually organize files in Google Drive after syncing
- OAuth tokens refresh automatically when expired
