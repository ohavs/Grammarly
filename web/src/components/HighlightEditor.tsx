import {
  ChangeEvent,
  UIEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { Issue, IssueCategory } from "@writeright/shared";

interface Props {
  value: string;
  onChange: (value: string) => void;
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
  placeholder?: string;
}

const CATEGORY_CLASS: Record<IssueCategory, string> = {
  correctness: "underline-correctness",
  clarity: "underline-clarity",
  engagement: "underline-engagement",
  delivery: "underline-delivery",
};

interface Segment {
  text: string;
  issue?: Issue;
}

function buildSegments(text: string, issues: Issue[]): Segment[] {
  if (issues.length === 0) return [{ text }];
  const sorted = [...issues].sort((a, b) => a.offset - b.offset);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const issue of sorted) {
    if (issue.offset < cursor) continue;
    if (issue.offset > cursor) {
      segments.push({ text: text.slice(cursor, issue.offset) });
    }
    segments.push({
      text: text.slice(issue.offset, issue.offset + issue.length),
      issue,
    });
    cursor = issue.offset + issue.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

export function HighlightEditor({
  value,
  onChange,
  issues,
  onIssueClick,
  placeholder,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => buildSegments(value, issues), [value, issues]);

  function syncScroll(e: UIEvent<HTMLTextAreaElement>) {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
  }

  useLayoutEffect(() => {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [value, issues]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const mark = target.closest<HTMLElement>("[data-issue-id]");
      if (!mark || !onIssueClick) return;
      const id = mark.dataset.issueId;
      const issue = issues.find((i) => i.id === id);
      if (issue) onIssueClick(issue);
    }
    const backdrop = backdropRef.current;
    backdrop?.addEventListener("click", onClick);
    return () => backdrop?.removeEventListener("click", onClick);
  }, [issues, onIssueClick]);

  return (
    <div className="relative h-full w-full font-serif text-lg leading-relaxed">
      <div
        ref={backdropRef}
        aria-hidden
        className="pointer-events-auto absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-4 py-4 text-slate-900"
        style={{ wordBreak: "break-word" }}
      >
        {segments.map((seg, i) =>
          seg.issue ? (
            <span
              key={i}
              data-issue-id={seg.issue.id}
              className={`cursor-pointer ${CATEGORY_CLASS[seg.issue.category]}`}
              title={seg.issue.message}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
        {value.endsWith("\n") && <span> </span>}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={syncScroll}
        spellCheck={false}
        placeholder={placeholder}
        className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent px-4 py-4 font-serif text-lg leading-relaxed text-transparent caret-slate-900 outline-none placeholder:text-slate-400"
        style={{ WebkitTextFillColor: "transparent" }}
      />
    </div>
  );
}
