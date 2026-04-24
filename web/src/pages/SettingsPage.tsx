import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { UserSettings } from "@writeright/shared";
import { api } from "../lib/api";

const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
];

const AUDIENCE = [
  { value: "general", label: "General" },
  { value: "knowledgeable", label: "Knowledgeable" },
  { value: "expert", label: "Expert" },
] as const;

const FORMALITY = [
  { value: "informal", label: "Informal" },
  { value: "neutral", label: "Neutral" },
  { value: "formal", label: "Formal" },
] as const;

const INTENT = [
  { value: "inform", label: "Inform" },
  { value: "describe", label: "Describe" },
  { value: "convince", label: "Convince" },
  { value: "tell-a-story", label: "Tell a story" },
] as const;

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "saving">("");

  useEffect(() => {
    api.getSettings().then(({ settings }) => setSettings(settings));
    api.listDictionary().then(({ words }) => setWords(words));
  }, []);

  async function update(patch: Partial<UserSettings>) {
    setSaveStatus("saving");
    const { settings } = await api.updateSettings(patch);
    setSettings(settings);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(""), 1500);
  }

  async function addWord(e: FormEvent) {
    e.preventDefault();
    if (!newWord.trim()) return;
    const { words } = await api.addWord(newWord.trim());
    setWords(words);
    setNewWord("");
  }

  async function removeWord(word: string) {
    const { words } = await api.removeWord(word);
    setWords(words);
  }

  if (!settings) {
    return <div className="p-10 text-slate-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            to="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Dashboard
          </Link>
          <h1 className="text-lg font-semibold">Settings</h1>
          <span className="w-20 text-right text-xs text-slate-500">
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        <section className="rounded-lg bg-white p-6 ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Language</h2>
          <div className="mt-3">
            <select
              value={settings.language}
              onChange={(e) => update({ language: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">
            Writing goals
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Adjust suggestions based on your audience and tone.
          </p>

          <Field label="Audience">
            <SegmentedControl
              options={AUDIENCE}
              value={settings.audience}
              onChange={(audience) => update({ audience })}
            />
          </Field>
          <Field label="Formality">
            <SegmentedControl
              options={FORMALITY}
              value={settings.formality}
              onChange={(formality) => update({ formality })}
            />
          </Field>
          <Field label="Intent">
            <SegmentedControl
              options={INTENT}
              value={settings.intent}
              onChange={(intent) => update({ intent })}
            />
          </Field>
        </section>

        <section className="rounded-lg bg-white p-6 ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">
            Personal dictionary
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Words you add here won't be flagged as misspellings.
          </p>
          <form onSubmit={addWord} className="mt-3 flex gap-2">
            <input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Add a word"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add
            </button>
          </form>
          <ul className="mt-4 flex flex-wrap gap-2">
            {words.length === 0 && (
              <li className="text-xs text-slate-400">No words yet.</li>
            )}
            {words.map((w) => (
              <li
                key={w}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs"
              >
                {w}
                <button
                  onClick={() => removeWord(w)}
                  className="text-slate-400 hover:text-red-600"
                  aria-label={`Remove ${w}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-xs font-medium ${
            value === o.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
