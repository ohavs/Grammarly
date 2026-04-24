import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

interface Props {
  word: string;
  x: number;
  y: number;
  onPick: (replacement: string) => void;
  onClose: () => void;
}

export function SynonymPopover({ word, x, y, onPick, onClose }: Props) {
  const [synonyms, setSynonyms] = useState<string[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api.synonyms(word).then((res) => {
      if (!cancelled) setSynonyms(res.synonyms);
    });
    return () => {
      cancelled = true;
    };
  }, [word]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-40 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
      style={{ top: y, left: x }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Synonyms for “{word}”
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {synonyms === null ? (
          <span className="text-xs text-slate-400">Loading…</span>
        ) : synonyms.length === 0 ? (
          <span className="text-xs text-slate-400">No synonyms found</span>
        ) : (
          synonyms.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-brand-100 hover:text-brand-700"
            >
              {s}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
