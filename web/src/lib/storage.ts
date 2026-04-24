import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import type { Document, UserSettings } from "@writeright/shared";

interface WRDB extends DBSchema {
  documents: {
    key: string;
    value: Document;
    indexes: { "by-updated": string };
  };
  kv: {
    key: string;
    value: unknown;
  };
  dictionary: {
    key: string;
    value: { word: string };
  };
}

const DB_NAME = "writeright";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WRDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<WRDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const docs = db.createObjectStore("documents", { keyPath: "id" });
        docs.createIndex("by-updated", "updatedAt");
        db.createObjectStore("kv");
        db.createObjectStore("dictionary", { keyPath: "word" });
      },
    });
  }
  return dbPromise;
}

function nowIso() {
  return new Date().toISOString();
}

const LOCAL_USER_ID = "local-user";

export const storage = {
  async listDocuments(): Promise<Document[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex("documents", "by-updated");
    return all.reverse();
  },

  async getDocument(id: string): Promise<Document | null> {
    const db = await getDB();
    return (await db.get("documents", id)) ?? null;
  },

  async createDocument(title: string, content = ""): Promise<Document> {
    const db = await getDB();
    const doc: Document = {
      id: nanoid(12),
      userId: LOCAL_USER_ID,
      title: title || "Untitled document",
      content,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await db.put("documents", doc);
    return doc;
  },

  async updateDocument(
    id: string,
    patch: { title?: string; content?: string },
  ): Promise<Document | null> {
    const db = await getDB();
    const existing = await db.get("documents", id);
    if (!existing) return null;
    const updated: Document = {
      ...existing,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      updatedAt: nowIso(),
    };
    await db.put("documents", updated);
    return updated;
  },

  async deleteDocument(id: string): Promise<boolean> {
    const db = await getDB();
    const existing = await db.get("documents", id);
    if (!existing) return false;
    await db.delete("documents", id);
    return true;
  },

  async getSettings(): Promise<UserSettings> {
    const db = await getDB();
    const stored = (await db.get("kv", "settings")) as UserSettings | undefined;
    return (
      stored ?? {
        language: "en-US",
        audience: "general",
        formality: "neutral",
        intent: "inform",
      }
    );
  },

  async saveSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const merged: UserSettings = { ...current, ...patch };
    const db = await getDB();
    await db.put("kv", merged, "settings");
    return merged;
  },

  async listDictionary(): Promise<string[]> {
    const db = await getDB();
    const all = await db.getAll("dictionary");
    return all.map((e) => e.word).sort();
  },

  async addWord(word: string): Promise<string[]> {
    const db = await getDB();
    await db.put("dictionary", { word: word.trim() });
    return this.listDictionary();
  },

  async removeWord(word: string): Promise<string[]> {
    const db = await getDB();
    await db.delete("dictionary", word);
    return this.listDictionary();
  },
};
