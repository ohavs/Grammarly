import type {
  CheckResponse,
  Document,
  User,
  UserSettings,
} from "@writeright/shared";

const API_BASE = "/api";

let authToken: string | null = localStorage.getItem("writeright_token");

export function setToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("writeright_token", token);
  else localStorage.removeItem("writeright_token");
}

export function getToken() {
  return authToken;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (authToken) headers.set("authorization", `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `${res.status}`);
  }
  return (await res.json()) as T;
}

export const api = {
  register: (email: string, name: string, password: string) =>
    request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>("/auth/me"),

  listDocuments: () => request<{ documents: Document[] }>("/documents"),
  getDocument: (id: string) =>
    request<{ document: Document }>(`/documents/${id}`),
  createDocument: (title: string) =>
    request<{ document: Document }>("/documents", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  updateDocument: (
    id: string,
    patch: { title?: string; content?: string },
  ) =>
    request<{ document: Document }>(`/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteDocument: (id: string) =>
    request<{ ok: boolean }>(`/documents/${id}`, { method: "DELETE" }),

  check: (text: string, language = "en-US") =>
    request<CheckResponse>("/check", {
      method: "POST",
      body: JSON.stringify({ text, language }),
    }),
  stats: (text: string) =>
    request<{
      words: number;
      characters: number;
      charactersNoSpaces: number;
      uniqueWords: number;
      sentences: number;
      paragraphs: number;
      readingTimeSec: number;
      speakingTimeSec: number;
      avgWordLength: number;
      avgSentenceLength: number;
      fleschReadingEase: number;
      fleschKincaidGrade: number;
      readabilityLabel: string;
    }>("/stats", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  tone: (text: string) =>
    request<{ tones: { label: string; score: number }[]; summary: string }>(
      "/tone",
      { method: "POST", body: JSON.stringify({ text }) },
    ),

  getSettings: () => request<{ settings: UserSettings }>("/settings"),
  updateSettings: (patch: Partial<UserSettings>) =>
    request<{ settings: UserSettings }>("/settings", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  listDictionary: () => request<{ words: string[] }>("/dictionary"),
  addWord: (word: string) =>
    request<{ words: string[] }>("/dictionary", {
      method: "POST",
      body: JSON.stringify({ word }),
    }),
  removeWord: (word: string) =>
    request<{ words: string[] }>(
      `/dictionary/${encodeURIComponent(word)}`,
      { method: "DELETE" },
    ),
};
