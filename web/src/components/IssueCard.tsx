import type { Issue, IssueCategory } from "@writeright/shared";

const DOT_CLASS: Record<IssueCategory, string> = {
  correctness: "bg-correctness",
  clarity: "bg-clarity",
  engagement: "bg-engagement",
  delivery: "bg-delivery",
};

interface Props {
  issue: Issue;
  text: string;
  onApply: (issue: Issue, replacement: string) => void;
  onDismiss: (issue: Issue) => void;
  isActive?: boolean;
  onFocus?: (issue: Issue) => void;
}

export function IssueCard({
  issue,
  text,
  onApply,
  onDismiss,
  isActive,
  onFocus,
}: Props) {
  const excerpt = text.slice(issue.offset, issue.offset + issue.length);
  return (
    <div
      onMouseEnter={() => onFocus?.(issue)}
      className={`rounded-lg border bg-white p-3 shadow-sm transition-colors ${
        isActive
          ? "border-brand-500 ring-2 ring-brand-500/20"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <span
          className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[issue.category]}`}
        />
        {issue.shortMessage}
      </div>
      <p className="mt-2 text-sm text-slate-900">{issue.message}</p>
      {excerpt && (
        <div className="mt-2 rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
          “{excerpt}”
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {issue.suggestions.length > 0 ? (
          issue.suggestions.map((s) => (
            <button
              key={s.value}
              onClick={() => onApply(issue, s.value)}
              className="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
            >
              {s.value || "(remove)"}
            </button>
          ))
        ) : (
          <span className="text-xs text-slate-400">No auto-fix available</span>
        )}
        <button
          onClick={() => onDismiss(issue)}
          className="ml-auto text-xs text-slate-400 hover:text-slate-600"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
