import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "comprendo.db");

// Ensure data dir exists
fs.mkdirSync(DATA_DIR, { recursive: true });

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    migrate(_db);
  }
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      github_id INTEGER UNIQUE NOT NULL,
      login TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      access_token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS repos (
      id INTEGER PRIMARY KEY,
      github_id INTEGER UNIQUE NOT NULL,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      description TEXT,
      language TEXT,
      stars INTEGER DEFAULT 0,
      default_branch TEXT DEFAULT 'main',
      clone_url TEXT,
      updated_at TEXT,
      cloned_at TEXT,
      clone_path TEXT,
      user_id INTEGER REFERENCES users(id)
    );
  `);
}

export const db = {
  get instance() {
    return getDb();
  },

  // --- Users ---
  upsertUser(data: {
    githubId: number;
    login: string;
    name: string | null;
    avatarUrl: string | null;
    accessToken: string;
  }) {
    const stmt = getDb().prepare(`
      INSERT INTO users (github_id, login, name, avatar_url, access_token)
      VALUES (@githubId, @login, @name, @avatarUrl, @accessToken)
      ON CONFLICT(github_id) DO UPDATE SET
        login = @login,
        name = @name,
        avatar_url = @avatarUrl,
        access_token = @accessToken,
        updated_at = datetime('now')
    `);
    return stmt.run(data);
  },

  getUserByGithubId(githubId: number) {
    return getDb()
      .prepare("SELECT * FROM users WHERE github_id = ?")
      .get(githubId) as Record<string, unknown> | undefined;
  },

  getUserByLogin(login: string) {
    return getDb()
      .prepare("SELECT * FROM users WHERE login = ?")
      .get(login) as Record<string, unknown> | undefined;
  },

  // --- Repos ---
  upsertRepo(data: {
    githubId: number;
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    stars: number;
    defaultBranch: string;
    cloneUrl: string;
    updatedAt: string;
    userId: number;
  }) {
    const stmt = getDb().prepare(`
      INSERT INTO repos (github_id, owner, name, full_name, description, language, stars, default_branch, clone_url, updated_at, user_id)
      VALUES (@githubId, @owner, @name, @fullName, @description, @language, @stars, @defaultBranch, @cloneUrl, @updatedAt, @userId)
      ON CONFLICT(github_id) DO UPDATE SET
        description = @description,
        language = @language,
        stars = @stars,
        default_branch = @defaultBranch,
        clone_url = @cloneUrl,
        updated_at = @updatedAt
    `);
    return stmt.run(data);
  },

  getReposByUserId(userId: number) {
    return getDb()
      .prepare("SELECT * FROM repos WHERE user_id = ? ORDER BY stars DESC")
      .all(userId) as Record<string, unknown>[];
  },

  getRepo(owner: string, name: string) {
    return getDb()
      .prepare("SELECT * FROM repos WHERE owner = ? AND name = ?")
      .get(owner, name) as Record<string, unknown> | undefined;
  },

  setRepoCloned(repoId: number, clonePath: string) {
    getDb()
      .prepare(
        "UPDATE repos SET cloned_at = datetime('now'), clone_path = ? WHERE id = ?"
      )
      .run(clonePath, repoId);
  },
};
