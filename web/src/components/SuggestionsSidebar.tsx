import { useMemo, useState } from "react";
import type { Issue, IssueCategory } from "@writeright/shared";
import { IssueCard } from "./IssueCard";

interface Props {
  text: string;
  issues: Issue[];
  activeIssueId: string | null;
  onApply: (issue: Issue, replacement: string) => void;
  onDismiss: (issue: Issue) => void;
  onFocus: (issue: Issue | null) => void;
  stats?: {
    words: number;
    characters: number;
    readingTimeSec: number;
    readabilityLabel: string;
    fleschReadingEase: number;
  };
  tone?: { tones: { label: string; score: number }[]; summary: string };
}

type Tab = "all" | IssueCategory;

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: "all", label: "All", color: "bg-slate-400" },
  { id: "correctness", label: "Correctness", color: "bg-correctness" },
  { id: "clarity", label: "Clarity", color: "bg-clarity" },
  { id: "engagement", label: "Engagement", color: "bg-engagement" },
  { id: "delivery", label: "Delivery", color: "bg-delivery" },
];

export function SuggestionsSidebar({
  text,
  issues,
  activeIssueId,
  onApply,
  onDismiss,
  onFocus,
  stats,
  tone,
}: Props) {
  const [tab, setTab] = useState<Tab>("all");

  const counts = useMemo(() => {
    const c: Record<IssueCategory, number> = {
      correctness: 0,
      clarity: 0,
      engagement: 0,
      delivery: 0,
    };
    for (const i of issues) c[i.category]++;
    return c;
  }, [issues]);

  const filtered = useMemo(
    () => (tab === "all" ? issues : issues.filter((i) => i.category === tab)),
    [issues, tab],
  );

  const overallScore = useMemo(() => {
    if (!stats) return null;
    const base = Math.round(stats.fleschReadingEase);
    const penalty = Math.min(50, issues.length * 2);
    return Math.max(0, Math.min(100, base - penalty));
  }, [stats, issues]);

  return (
    <aside className="flex h-full w-80 flex-col border-l border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700">Assistant</h2>
        {overallScore != null && (
          <div className="mt-3 flex items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700 ring-2 ring-brand-500/40">
              {overallScore}
            </div>
            <div className="text-xs text-slate-600">
              <div className="font-medium">Overall score</div>
              <div>{stats?.readabilityLabel}</div>
            </div>
          </div>
        )}
        {stats && (
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-slate-600">
            <dt>Words</dt>
            <dd className="text-right">{stats.words}</dd>
            <dt>Characters</dt>
            <dd className="text-right">{stats.characters}</dd>
            <dt>Reading time</dt>
            <dd className="text-right">{stats.readingTimeSec}s</dd>
          </dl>
        )}
        {tone && tone.tones.length > 0 && (
          <div className="mt-3 text-xs">
            <div className="font-medium text-slate-700">Tone</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {tone.tones.map((t) => (
                <span
                  key={t.label}
                  className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200"
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2">
        {TABS.map((t) => {
          const count =
            t.id === "all"
              ? issues.length
              : counts[t.id as IssueCategory] ?? 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                tab === t.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${t.color}`} />
              {t.label}
              <span className="ml-0.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            {issues.length === 0
              ? "No issues — looking clean!"
              : "No issues in this category"}
          </div>
        ) : (
          filtered.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              text={text}
              onApply={onApply}
              onDismiss={onDismiss}
              onFocus={onFocus}
              isActive={issue.id === activeIssueId}
            />
          ))
        )}
      </div>
    </aside>
  );
}
