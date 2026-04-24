import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Document, Issue } from "@writeright/shared";
import { api } from "../lib/api";
import { HighlightEditor } from "../components/HighlightEditor";
import { SuggestionsSidebar } from "../components/SuggestionsSidebar";

interface Stats {
  words: number;
  characters: number;
  readingTimeSec: number;
  readabilityLabel: string;
  fleschReadingEase: number;
}

interface Tone {
  tones: { label: string; score: number }[];
  summary: string;
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getDocument(id).then(({ document }) => {
      setDoc(document);
      setContent(document.content);
      setTitle(document.title);
    });
  }, [id]);

  const runAnalysis = useCallback(async () => {
    if (!content.trim()) {
      setIssues([]);
      setStats(null);
      setTone(null);
      return;
    }
    setChecking(true);
    try {
      const [checkRes, statsRes, toneRes] = await Promise.all([
        api.check(content),
        api.stats(content),
        api.tone(content),
      ]);
      setIssues(checkRes.issues);
      setStats(statsRes);
      setTone(toneRes);
    } finally {
      setChecking(false);
    }
  }, [content]);

  const visibleIssues = issues.filter((i) => !dismissed.has(i.id));

  function applyFix(issue: Issue, replacement: string) {
    const before = content.slice(0, issue.offset);
    const after = content.slice(issue.offset + issue.length);
    const next = before + replacement + after;
    setContent(next);
    const delta = replacement.length - issue.length;
    setIssues((prev) =>
      prev
        .filter((i) => i.id !== issue.id)
        .map((i) =>
          i.offset > issue.offset ? { ...i, offset: i.offset + delta } : i,
        ),
    );
  }

  function dismiss(issue: Issue) {
    setDismissed((prev) => new Set(prev).add(issue.id));
  }

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
          onClick={runAnalysis}
          disabled={checking}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {checking ? "Analyzing…" : "Analyze"}
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-3xl flex-1 px-2 py-4">
          <HighlightEditor
            value={content}
            onChange={setContent}
            issues={visibleIssues}
            onIssueClick={(issue) => setActiveId(issue.id)}
            placeholder="Start writing…"
          />
        </div>
        <SuggestionsSidebar
          text={content}
          issues={visibleIssues}
          activeIssueId={activeId}
          onApply={applyFix}
          onDismiss={dismiss}
          onFocus={(issue) => setActiveId(issue?.id ?? null)}
          stats={stats ?? undefined}
          tone={tone ?? undefined}
        />
      </div>
    </div>
  );
}
