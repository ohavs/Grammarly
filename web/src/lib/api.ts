import type {
  CheckResponse,
  Document,
  UserSettings,
} from "@writeright/shared";
import { checkText } from "./engine/checker";
import { computeStats, type TextStats } from "./engine/stats";
import { analyzeTone, type ToneResult } from "./engine/tone";
import { lookupSynonyms } from "./engine/synonyms";
import { storage } from "./storage";

export const api = {
  listDocuments: async (): Promise<{ documents: Document[] }> => ({
    documents: await storage.listDocuments(),
  }),
  getDocument: async (id: string): Promise<{ document: Document }> => {
    const document = await storage.getDocument(id);
    if (!document) throw new Error("Document not found");
    return { document };
  },
  createDocument: async (title: string): Promise<{ document: Document }> => ({
    document: await storage.createDocument(title),
  }),
  updateDocument: async (
    id: string,
    patch: { title?: string; content?: string },
  ): Promise<{ document: Document }> => {
    const document = await storage.updateDocument(id, patch);
    if (!document) throw new Error("Document not found");
    return { document };
  },
  deleteDocument: async (id: string): Promise<{ ok: boolean }> => ({
    ok: await storage.deleteDocument(id),
  }),

  check: async (text: string, language = "en-US"): Promise<CheckResponse> => {
    const settings = await storage.getSettings();
    const personal = await storage.listDictionary();
    return checkText(text, {
      language,
      formality: settings.formality,
      personal,
    });
  },

  stats: async (text: string): Promise<TextStats> => computeStats(text),

  tone: async (text: string): Promise<ToneResult> => analyzeTone(text),

  getSettings: async (): Promise<{ settings: UserSettings }> => ({
    settings: await storage.getSettings(),
  }),
  updateSettings: async (
    patch: Partial<UserSettings>,
  ): Promise<{ settings: UserSettings }> => ({
    settings: await storage.saveSettings(patch),
  }),

  listDictionary: async (): Promise<{ words: string[] }> => ({
    words: await storage.listDictionary(),
  }),
  addWord: async (word: string): Promise<{ words: string[] }> => ({
    words: await storage.addWord(word),
  }),
  removeWord: async (word: string): Promise<{ words: string[] }> => ({
    words: await storage.removeWord(word),
  }),

  synonyms: async (
    word: string,
  ): Promise<{ word: string; synonyms: string[] }> => ({
    word,
    synonyms: lookupSynonyms(word),
  }),
};
