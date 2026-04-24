import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Document } from "@writeright/shared";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

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
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
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
      </header>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium">Your documents</h2>
        <button
          onClick={createNew}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          New document
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-slate-500">
            No documents yet. Create your first one.
          </p>
        ) : (
          docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg bg-white p-4 ring-1 ring-slate-200 hover:ring-brand-500"
            >
              <Link to={`/documents/${d.id}`} className="flex-1">
                <div className="font-medium">{d.title}</div>
                <div className="text-xs text-slate-500">
                  Updated {new Date(d.updatedAt).toLocaleString()}
                </div>
              </Link>
              <button
                onClick={() => remove(d.id)}
                className="ml-4 text-sm text-slate-400 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
