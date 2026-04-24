import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import type { User } from "@writeright/shared";

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

const findByEmail = db.prepare(
  "SELECT * FROM users WHERE email = ? COLLATE NOCASE",
);
const findById = db.prepare("SELECT * FROM users WHERE id = ?");
const insertUser = db.prepare(
  "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
);

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function register(
  email: string,
  name: string,
  password: string,
): Promise<User> {
  const normalized = email.trim().toLowerCase();
  if (findByEmail.get(normalized)) {
    throw new AuthError("Email already registered", 409);
  }
  const hash = await bcrypt.hash(password, 10);
  const id = nanoid(12);
  insertUser.run(id, normalized, name.trim(), hash);
  return toUser(findById.get(id) as UserRow);
}

export async function login(
  email: string,
  password: string,
): Promise<User> {
  const row = findByEmail.get(email.trim().toLowerCase()) as
    | UserRow
    | undefined;
  if (!row) throw new AuthError("Invalid credentials", 401);
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw new AuthError("Invalid credentials", 401);
  return toUser(row);
}

export function getUser(id: string): User | null {
  const row = findById.get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}
