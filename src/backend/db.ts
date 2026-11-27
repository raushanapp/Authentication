import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { HashedPassword } from "./auth.js";

export interface User {
  id: number;
  email: string;
  hashedPassword: HashedPassword;
  agreedToTerms: boolean;
}

export interface UserRepository {
  create(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | undefined>;
  get(userId: number): Promise<User | undefined>;
}

export class SqliteUserRepository implements UserRepository {
  constructor(private db: Database.Database) {}

  async create(user: User): Promise<User> {
    const insert = this.db.prepare(
      "INSERT INTO users(email, hashedPassword, agreedToTerms) VALUES (?, ?, ?) RETURNING id",
    );
    const result = insert.get(
      user.email,
      user.hashedPassword.hashed,
      user.agreedToTerms ? 1 : 0,
    ) as { id: number };
    return {
      ...user,
      id: result.id,
    };
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const stmt = this.db.prepare("SELECT * FROM users WHERE email = ?");
    return (stmt.get(email) as User | undefined) ?? undefined;
  }

  async get(userId: number): Promise<User | undefined> {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
    return (stmt.get(userId) as User | undefined) ?? undefined;
  }
}

export class SqliteSession {
  constructor(private readonly db: Database.Database) {}

  async create(userId: number): Promise<string> {
    const sessionId = uuidv4();
    const insert = this.db.prepare(
      "INSERT INTO sessions(session_id, user_id) VALUES (?, ?)",
    );
    insert.run(sessionId, userId);
    return sessionId;
  }

  async get(sessionId: string): Promise<User | undefined> {
    const stmt = this.db.prepare(
      "SELECT user_id FROM sessions WHERE session_id = ?",
    );
    const result = stmt.get(sessionId) as { user_id: number } | undefined;
    if (result === undefined) return undefined;
    const users = new SqliteUserRepository(this.db);
    return await users.get(result.user_id);
  }
}

export function connect(connectionString: string): Database.Database {
  return new Database(connectionString);
}

export function newDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        hashedPassword TEXT NOT NULL,
        agreedToTerms BOOLEAN NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
        session_id UUID PRIMARY KEY,
        user_id INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}
