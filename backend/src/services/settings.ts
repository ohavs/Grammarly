import { db } from "../db.js";
import type { UserSettings } from "@writeright/shared";

interface Row {
  language: string;
  audience: string;
  formality: string;
  intent: string;
}

const getStmt = db.prepare(
  "SELECT language, audience, formality, intent FROM user_settings WHERE user_id = ?",
);
const upsertStmt = db.prepare(`
  INSERT INTO user_settings (user_id, language, audience, formality, intent, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(user_id) DO UPDATE SET
    language = excluded.language,
    audience = excluded.audience,
    formality = excluded.formality,
    intent = excluded.intent,
    updated_at = datetime('now')
`);

const DEFAULTS: UserSettings = {
  language: "en-US",
  audience: "general",
  formality: "neutral",
  intent: "inform",
};

export function getSettings(userId: string): UserSettings {
  const row = getStmt.get(userId) as Row | undefined;
  if (!row) return { ...DEFAULTS };
  return {
    language: row.language,
    audience: row.audience as UserSettings["audience"],
    formality: row.formality as UserSettings["formality"],
    intent: row.intent as UserSettings["intent"],
  };
}

export function saveSettings(
  userId: string,
  patch: Partial<UserSettings>,
): UserSettings {
  const current = getSettings(userId);
  const merged: UserSettings = { ...current, ...patch };
  upsertStmt.run(
    userId,
    merged.language,
    merged.audience,
    merged.formality,
    merged.intent,
  );
  return merged;
}
