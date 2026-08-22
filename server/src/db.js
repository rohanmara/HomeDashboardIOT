import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'study.db');

export function initDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flow TEXT NOT NULL DEFAULT 'focus',
      startedAt TEXT NOT NULL,
      endedAt TEXT,
      durationSeconds INTEGER,
      source TEXT NOT NULL DEFAULT 'dashboard'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_endedAt ON sessions(endedAt);
    CREATE INDEX IF NOT EXISTS idx_sessions_startedAt ON sessions(startedAt);
  `);

  return db;
}
