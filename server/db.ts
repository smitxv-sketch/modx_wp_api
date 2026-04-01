import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

// Initialize local SQLite database for sync settings
export const localDb = new Database('sync_settings.db');

// Create table if it doesn't exist
localDb.exec(`
  CREATE TABLE IF NOT EXISTS excluded_resources (
    resource_id INTEGER PRIMARY KEY,
    excluded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS export_templates (
    template_id INTEGER PRIMARY KEY,
    is_exportable BOOLEAN DEFAULT 1,
    alias TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS export_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    field_name TEXT,
    is_exportable BOOLEAN DEFAULT 1,
    alias TEXT,
    cast_type TEXT DEFAULT 'string',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, field_name)
  );
`);

// Create MySQL connection pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'modx_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const getPrefix = () => process.env.DB_PREFIX || 'modx_';

export const getExcludedIds = () => {
  try {
    const stmt = localDb.prepare('SELECT resource_id FROM excluded_resources');
    const rows = stmt.all();
    return rows.map((r: any) => r.resource_id);
  } catch (e) {
    return [];
  }
};
