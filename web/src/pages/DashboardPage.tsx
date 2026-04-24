import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Document } from "@writeright/shared";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso + "Z").getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function wordCount(text: string): number {
  return (text.match(/\b[\p{L}\p{N}']+\b/gu) ?? []).length;
}

function preview(text: string, max = 140): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? trimmed.slice(0, max) + "…" : trimmed;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function load() {
    const { documents } = await api.listDocuments();
    setDocs(documents);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createNew() {
    const { document } = await api.createDocument("Untitled document");
    navigate(`/documents/${document.id}`);
  }

  async function remove(id: string) {
    await api.deleteDocument(id);
    setConfirmingId(null);
    load();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q),
    );
  }, [docs, query]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold text-brand-700">WriteRight</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{user?.name}</span>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Your documents</h2>
            <p className="text-sm text-slate-500">
              {docs.length} total · {filtered.length} shown
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents…"
              className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={createNew}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              + New document
            </button>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : docs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <h3 className="text-lg font-medium">No documents yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Create your first document to start writing.
              </p>
              <button
                onClick={createNew}
                className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Create document
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No documents match “{query}”.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((d) => (
                <li
                  key={d.id}
                  className="group relative flex flex-col rounded-lg bg-white p-4 ring-1 ring-slate-200 hover:ring-brand-500"
                >
                  <Link
                    to={`/documents/${d.id}`}
                    className="flex-1 focus:outline-none"
                  >
                    <div className="line-clamp-1 font-medium">{d.title}</div>
                    <div className="mt-1 line-clamp-3 text-sm text-slate-500">
                      {preview(d.content) || (
                        <span className="italic">Empty document</span>
                      )}
                    </div>
                  </Link>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {wordCount(d.content)} words ·{" "}
                      {formatRelative(d.updatedAt)}
                    </span>
                    {confirmingId === d.id ? (
                      <span className="flex gap-2">
                        <button
                          onClick={() => remove(d.id)}
                          className="font-medium text-red-600 hover:text-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(d.id)}
                        className="opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
