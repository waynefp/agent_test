/**
 * Notes MCP Server
 *
 * A simple MCP server that manages notes - demonstrates the MCP pattern.
 *
 * BEGINNER NOTE: This is a complete, working MCP server you can use
 * as a template for building your own servers.
 *
 * Phase 14: MCP Servers
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Types
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesStore {
  notes: Note[];
}

// Configuration
const DATA_DIR = process.env.NOTES_DATA_DIR || './data/mcp-notes';
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

// Helper functions
async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadNotes(): Promise<NotesStore> {
  try {
    const data = await fs.readFile(NOTES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { notes: [] };
  }
}

async function saveNotes(store: NotesStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(NOTES_FILE, JSON.stringify(store, null, 2));
}

// Create the MCP server
const server = new McpServer({
  name: 'notes-server',
  version: '1.0.0',
});

/**
 * Tool: Create a new note
 */
server.tool(
  'create_note',
  {
    title: z.string().describe('The title of the note'),
    content: z.string().describe('The content/body of the note'),
  },
  async ({ title, content }) => {
    const store = await loadNotes();

    const note: Note = {
      id: randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.notes.push(note);
    await saveNotes(store);

    console.error(`[Notes] Created note: ${note.id} - ${title}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Note created successfully',
            note: {
              id: note.id,
              title: note.title,
              createdAt: note.createdAt,
            },
          }, null, 2),
        },
      ],
    };
  }
);

/**
 * Tool: List all notes
 */
server.tool(
  'list_notes',
  {},
  async () => {
    const store = await loadNotes();

    const notesList = store.notes.map(note => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      preview: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
    }));

    console.error(`[Notes] Listed ${notesList.length} notes`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            count: notesList.length,
            notes: notesList,
          }, null, 2),
        },
      ],
    };
  }
);

/**
 * Tool: Get a specific note
 */
server.tool(
  'get_note',
  {
    id: z.string().describe('The ID of the note to retrieve'),
  },
  async ({ id }) => {
    const store = await loadNotes();
    const note = store.notes.find(n => n.id === id);

    if (!note) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: `Note not found: ${id}`,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    console.error(`[Notes] Retrieved note: ${id}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            note,
          }, null, 2),
        },
      ],
    };
  }
);

/**
 * Tool: Update a note
 */
server.tool(
  'update_note',
  {
    id: z.string().describe('The ID of the note to update'),
    title: z.string().optional().describe('New title (optional)'),
    content: z.string().optional().describe('New content (optional)'),
  },
  async ({ id, title, content }) => {
    const store = await loadNotes();
    const noteIndex = store.notes.findIndex(n => n.id === id);

    if (noteIndex === -1) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: `Note not found: ${id}`,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    if (title) store.notes[noteIndex].title = title;
    if (content) store.notes[noteIndex].content = content;
    store.notes[noteIndex].updatedAt = new Date().toISOString();

    await saveNotes(store);

    console.error(`[Notes] Updated note: ${id}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Note updated successfully',
            note: store.notes[noteIndex],
          }, null, 2),
        },
      ],
    };
  }
);

/**
 * Tool: Delete a note
 */
server.tool(
  'delete_note',
  {
    id: z.string().describe('The ID of the note to delete'),
    confirm: z.boolean().describe('Must be true to confirm deletion'),
  },
  async ({ id, confirm }) => {
    if (!confirm) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Deletion not confirmed. Set confirm: true to delete.',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    const store = await loadNotes();
    const noteIndex = store.notes.findIndex(n => n.id === id);

    if (noteIndex === -1) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: `Note not found: ${id}`,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    const deletedNote = store.notes.splice(noteIndex, 1)[0];
    await saveNotes(store);

    console.error(`[Notes] Deleted note: ${id}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Note deleted successfully',
            deletedNote: {
              id: deletedNote.id,
              title: deletedNote.title,
            },
          }, null, 2),
        },
      ],
    };
  }
);

/**
 * Tool: Search notes
 */
server.tool(
  'search_notes',
  {
    query: z.string().describe('Search query (searches title and content)'),
  },
  async ({ query }) => {
    const store = await loadNotes();
    const lowerQuery = query.toLowerCase();

    const matches = store.notes.filter(note =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery)
    );

    console.error(`[Notes] Search "${query}" found ${matches.length} results`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            query,
            count: matches.length,
            results: matches.map(note => ({
              id: note.id,
              title: note.title,
              preview: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
            })),
          }, null, 2),
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Notes MCP Server] Running on stdio');
  console.error(`[Notes MCP Server] Data directory: ${DATA_DIR}`);
}

main().catch((error) => {
  console.error('[Notes MCP Server] Fatal error:', error);
  process.exit(1);
});
