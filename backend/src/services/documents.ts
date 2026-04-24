import { nanoid } from "nanoid";
import { db } from "../db.js";
import type { Document } from "@writeright/shared";

interface DocRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const listByUser = db.prepare(
  "SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC",
);
const getOne = db.prepare(
  "SELECT * FROM documents WHERE id = ? AND user_id = ?",
);
const insertDoc = db.prepare(
  "INSERT INTO documents (id, user_id, title, content) VALUES (?, ?, ?, ?)",
);
const updateDoc = db.prepare(
  "UPDATE documents SET title = COALESCE(?, title), content = COALESCE(?, content), updated_at = datetime('now') WHERE id = ? AND user_id = ?",
);
const deleteDoc = db.prepare(
  "DELETE FROM documents WHERE id = ? AND user_id = ?",
);

function toDoc(row: DocRow): Document {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listDocuments(userId: string): Document[] {
  return (listByUser.all(userId) as DocRow[]).map(toDoc);
}

export function getDocument(userId: string, id: string): Document | null {
  const row = getOne.get(id, userId) as DocRow | undefined;
  return row ? toDoc(row) : null;
}

export function createDocument(
  userId: string,
  title: string,
  content = "",
): Document {
  const id = nanoid(12);
  insertDoc.run(id, userId, title || "Untitled document", content);
  return toDoc(getOne.get(id, userId) as DocRow);
}

export function updateDocument(
  userId: string,
  id: string,
  patch: { title?: string; content?: string },
): Document | null {
  const result = updateDoc.run(
    patch.title ?? null,
    patch.content ?? null,
    id,
    userId,
  );
  if (result.changes === 0) return null;
  return toDoc(getOne.get(id, userId) as DocRow);
}

export function deleteDocument(userId: string, id: string): boolean {
  return deleteDoc.run(id, userId).changes > 0;
}
