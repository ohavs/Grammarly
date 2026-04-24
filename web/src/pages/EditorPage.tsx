import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Document, Issue } from "@writeright/shared";
import { api } from "../lib/api";
import { HighlightEditor } from "../components/HighlightEditor";
import { SuggestionsSidebar } from "../components/SuggestionsSidebar";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

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

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const debouncedContent = useDebouncedValue(content, 700);
  const debouncedTitle = useDebouncedValue(title, 700);

  const lastSaved = useRef<{ title: string; content: string } | null>(null);
  const analysisSeq = useRef(0);

  useEffect(() => {
    if (!id) return;
    api.getDocument(id).then(({ document }) => {
      setDoc(document);
      setContent(document.content);
      setTitle(document.title);
      lastSaved.current = {
        title: document.title,
        content: document.content,
      };
    });
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    const seq = ++analysisSeq.current;
    if (!debouncedContent.trim()) {
      setIssues([]);
      setStats(null);
      setTone(null);
      setAnalyzing(false);
      return;
    }
    setAnalyzing(true);
    Promise.all([
      api.check(debouncedContent),
      api.stats(debouncedContent),
      api.tone(debouncedContent),
    ])
      .then(([checkRes, statsRes, toneRes]) => {
        if (seq !== analysisSeq.current) return;
        setIssues(checkRes.issues);
        setStats(statsRes);
        setTone(toneRes);
      })
      .finally(() => {
        if (seq === analysisSeq.current) setAnalyzing(false);
      });
  }, [debouncedContent, doc]);

  useEffect(() => {
    if (!doc || !id) return;
    const prev = lastSaved.current;
    if (
      !prev ||
      (prev.title === debouncedTitle && prev.content === debouncedContent)
    ) {
      return;
    }
    setSaveStatus("saving");
    api
      .updateDocument(id, {
        title: debouncedTitle,
        content: debouncedContent,
      })
      .then(() => {
        lastSaved.current = {
          title: debouncedTitle,
          content: debouncedContent,
        };
        setSaveStatus("saved");
      })
      .catch(() => setSaveStatus("error"));
  }, [debouncedTitle, debouncedContent, doc, id]);

  const visibleIssues = issues.filter((i) => !dismissed.has(i.id));

  function applyFix(issue: Issue, replacement: string) {
    const before = content.slice(0, issue.offset);
    const after = content.slice(issue.offset + issue.length);
    setContent(before + replacement + after);
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

  const statusLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : "";

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex items-center gap-4 border-b border-slate-200 px-6 py-3">
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
        <div className="flex min-w-[120px] items-center justify-end gap-2 text-xs text-slate-500">
          {analyzing && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
              Analyzing
            </span>
          )}
          {statusLabel && <span>{statusLabel}</span>}
        </div>
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
