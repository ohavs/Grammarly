import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Document, Issue } from "@writeright/shared";
import { api } from "../lib/api";
import { HighlightEditor } from "../components/HighlightEditor";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getDocument(id).then(({ document }) => {
      setDoc(document);
      setContent(document.content);
      setTitle(document.title);
    });
  }, [id]);

  const check = useCallback(async () => {
    if (!content.trim()) {
      setIssues([]);
      return;
    }
    setChecking(true);
    try {
      const res = await api.check(content);
      setIssues(res.issues);
    } finally {
      setChecking(false);
    }
  }, [content]);

  if (!doc) {
    return <div className="p-10 text-slate-500">Loading document…</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <Link
          to="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Dashboard
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 px-4 text-center text-sm font-medium outline-none"
        />
        <button
          onClick={check}
          disabled={checking}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {checking ? "Checking…" : "Check"}
        </button>
      </header>
      <div className="mx-auto w-full max-w-3xl flex-1 px-2 py-4">
        <HighlightEditor
          value={content}
          onChange={setContent}
          issues={issues}
          placeholder="Start writing…"
        />
      </div>
      <div className="border-t border-slate-100 px-6 py-2 text-xs text-slate-500">
        {issues.length === 0
          ? "No issues detected"
          : `${issues.length} issue${issues.length === 1 ? "" : "s"} · click an underline to see details (coming in next step)`}
      </div>
    </div>
  );
}
