/**
 * Database Tool
 *
 * SQLite database operations for persistent memory and data storage.
 * Allows the agent to store and retrieve structured data across sessions.
 *
 * BEGINNER NOTE: This tool provides a persistent memory layer using SQLite.
 * The database file is stored in /app/workspace so it survives container restarts.
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type { ToolResult, ToolExecutionOptions } from '../../types/tool.types.js';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Input schema for the Database tool
 * BEGINNER NOTE: Supports common SQL operations with safety checks
 */
const DatabaseInputSchema = z.object({
  operation: z.enum(
    ['execute', 'query', 'insert', 'update', 'delete', 'create_table', 'list_tables', 'describe_table'],
    {
      description: 'The database operation to perform',
    }
  ),
  sql: z.string().optional().describe('SQL query or statement to execute'),
  params: z.array(z.any()).optional().describe('Parameters for prepared statements (prevents SQL injection)'),
  table: z.string().optional().describe('Table name (for describe_table operation)'),
  database: z.string().default('agent_memory.db').describe('Database filename (default: agent_memory.db)'),
});

type DatabaseInput = z.infer<typeof DatabaseInputSchema>;

/**
 * Database Tool Implementation
 * BEGINNER NOTE: Provides persistent storage using SQLite
 */
export class DatabaseTool extends BaseTool {
  readonly name = 'database';

  readonly description =
    'Execute SQLite database operations for persistent data storage. ' +
    'Supports queries (SELECT), inserts, updates, deletes, and table management. ' +
    'Use prepared statements with params to prevent SQL injection. ' +
    'Data persists across agent restarts. ' +
    'Use this tool when you need to remember information long-term or work with structured data.';

  readonly inputSchema = DatabaseInputSchema;

  private dbPath: string;
  private dbCache: Map<string, Database.Database> = new Map();

  constructor(workspacePath: string = '/app/workspace') {
    super();
    this.dbPath = workspacePath;

    // Ensure workspace directory exists
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  async execute(input: unknown, _options?: ToolExecutionOptions): Promise<ToolResult> {
    const { operation, sql, params, table, database } = input as DatabaseInput;

    try {
      const db = this.getDatabase(database);

      let result: any;

      switch (operation) {
        case 'execute':
          if (!sql) {
            return { success: false, error: 'SQL statement is required for execute operation' };
          }
          result = this.executeStatement(db, sql, params);
          break;

        case 'query':
          if (!sql) {
            return { success: false, error: 'SQL query is required for query operation' };
          }
          result = this.executeQuery(db, sql, params);
          break;

        case 'insert':
          if (!sql) {
            return { success: false, error: 'SQL statement is required for insert operation' };
          }
          result = this.executeInsert(db, sql, params);
          break;

        case 'update':
          if (!sql) {
            return { success: false, error: 'SQL statement is required for update operation' };
          }
          result = this.executeUpdate(db, sql, params);
          break;

        case 'delete':
          if (!sql) {
            return { success: false, error: 'SQL statement is required for delete operation' };
          }
          result = this.executeDelete(db, sql, params);
          break;

        case 'create_table':
          if (!sql) {
            return { success: false, error: 'SQL statement is required for create_table operation' };
          }
          result = this.createTable(db, sql);
          break;

        case 'list_tables':
          result = this.listTables(db);
          break;

        case 'describe_table':
          if (!table) {
            return { success: false, error: 'Table name is required for describe_table operation' };
          }
          result = this.describeTable(db, table);
          break;

        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }

      return {
        success: true,
        data: result,
        metadata: {
          operation,
          database,
          rowCount: Array.isArray(result?.rows) ? result.rows.length : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          operation,
          database,
        },
      };
    }
  }

  /**
   * Get or create database connection
   * BEGINNER NOTE: Reuses connections for performance
   */
  private getDatabase(dbName: string): Database.Database {
    if (!this.dbCache.has(dbName)) {
      const dbFilePath = path.join(this.dbPath, dbName);
      const db = new Database(dbFilePath);
      db.pragma('journal_mode = WAL'); // Better concurrency
      this.dbCache.set(dbName, db);
    }
    return this.dbCache.get(dbName)!;
  }

  /**
   * Execute a statement (CREATE, DROP, ALTER, etc.)
   */
  private executeStatement(db: Database.Database, sql: string, params?: any[]): any {
    const stmt = db.prepare(sql);
    const info = params ? stmt.run(...params) : stmt.run();

    return {
      changes: info.changes,
      lastInsertRowid: info.lastInsertRowid,
      sql,
    };
  }

  /**
   * Execute a query (SELECT)
   */
  private executeQuery(db: Database.Database, sql: string, params?: any[]): any {
    const stmt = db.prepare(sql);
    const rows = params ? stmt.all(...params) : stmt.all();

    return {
      rows,
      count: rows.length,
      sql,
    };
  }

  /**
   * Execute an INSERT statement
   */
  private executeInsert(db: Database.Database, sql: string, params?: any[]): any {
    const stmt = db.prepare(sql);
    const info = params ? stmt.run(...params) : stmt.run();

    return {
      inserted: info.changes,
      lastId: info.lastInsertRowid,
      sql,
    };
  }

  /**
   * Execute an UPDATE statement
   */
  private executeUpdate(db: Database.Database, sql: string, params?: any[]): any {
    const stmt = db.prepare(sql);
    const info = params ? stmt.run(...params) : stmt.run();

    return {
      updated: info.changes,
      sql,
    };
  }

  /**
   * Execute a DELETE statement
   */
  private executeDelete(db: Database.Database, sql: string, params?: any[]): any {
    const stmt = db.prepare(sql);
    const info = params ? stmt.run(...params) : stmt.run();

    return {
      deleted: info.changes,
      sql,
    };
  }

  /**
   * Create a table
   */
  private createTable(db: Database.Database, sql: string): any {
    db.exec(sql);

    return {
      message: 'Table created successfully',
      sql,
    };
  }

  /**
   * List all tables in the database
   */
  private listTables(db: Database.Database): any {
    const stmt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    const tables = stmt.all();

    return {
      tables: tables.map((t: any) => t.name),
      count: tables.length,
    };
  }

  /**
   * Describe table structure
   */
  private describeTable(db: Database.Database, tableName: string): any {
    const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
    const columns = stmt.all();

    return {
      table: tableName,
      columns: columns.map((col: any) => ({
        name: col.name,
        type: col.type,
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1,
      })),
    };
  }

  /**
   * Close all database connections
   * BEGINNER NOTE: Call this when shutting down the server
   */
  closeAll(): void {
    for (const db of this.dbCache.values()) {
      db.close();
    }
    this.dbCache.clear();
  }
}

/**
 * Factory function to create a DatabaseTool
 */
export function createDatabaseTool(workspacePath: string = '/app/workspace'): DatabaseTool {
  return new DatabaseTool(workspacePath);
}
