import { db } from "../db.js";

const listStmt = db.prepare(
  "SELECT word FROM personal_dictionary WHERE user_id = ? ORDER BY word",
);
const addStmt = db.prepare(
  "INSERT OR IGNORE INTO personal_dictionary (user_id, word) VALUES (?, ?)",
);
const removeStmt = db.prepare(
  "DELETE FROM personal_dictionary WHERE user_id = ? AND word = ?",
);

export function listDictionary(userId: string): string[] {
  return (listStmt.all(userId) as { word: string }[]).map((r) => r.word);
}

export function addWord(userId: string, word: string): void {
  addStmt.run(userId, word.trim());
}

export function removeWord(userId: string, word: string): void {
  removeStmt.run(userId, word);
}
