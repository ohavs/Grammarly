import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Document } from "@writeright/shared";
import { api } from "../lib/api";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getDocument(id).then(({ document }) => {
      setDoc(document);
      setContent(document.content);
      setTitle(document.title);
    });
  }, [id]);

  if (!doc) {
    return (
      <div className="p-10 text-slate-500">Loading document…</div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">
          ← Dashboard
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 px-4 text-center text-sm font-medium outline-none"
        />
        <span className="text-xs text-slate-400">Editor coming in step 8</span>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing…"
          className="h-[60vh] w-full resize-none rounded-lg border border-slate-200 p-4 font-serif text-lg leading-relaxed outline-none focus:border-brand-500"
        />
      </div>
    </div>
  );
}
