import { unified } from "unified";
import retextEnglish from "retext-english";
import retextStringify from "retext-stringify";
import retextSpell from "retext-spell";
import retextRepeatedWords from "retext-repeated-words";
import retextIndefiniteArticle from "retext-indefinite-article";
import retextSentenceSpacing from "retext-sentence-spacing";
import retextRedundantAcronyms from "retext-redundant-acronyms";
import retextContractions from "retext-contractions";
import retextQuotes from "retext-quotes";
import retextEquality from "retext-equality";
import retextPassive from "retext-passive";
import retextReadability from "retext-readability";
import retextSimplify from "retext-simplify";
import retextIntensify from "retext-intensify";
import { nanoid } from "nanoid";
import type {
  Formality,
  Issue,
  IssueCategory,
  IssueSeverity,
} from "@writeright/shared";

// ── LanguageTool ─────────────────────────────────────────────────────────────

interface LTMatch {
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  context: { text: string; offset: number; length: number };
  rule: { id: string; category: { id: string; name: string } };
}

const LT_CAT: Record<string, { category: IssueCategory; severity: IssueSeverity }> = {
  GRAMMAR:       { category: "correctness", severity: "error" },
  TYPOS:         { category: "correctness", severity: "error" },
  CONFUSED_WORDS:{ category: "correctness", severity: "error" },
  CASING:        { category: "correctness", severity: "warning" },
  PUNCTUATION:   { category: "correctness", severity: "warning" },
  COMPOUNDING:   { category: "correctness", severity: "warning" },
  TYPOGRAPHY:    { category: "correctness", severity: "warning" },
  STYLE:         { category: "engagement",  severity: "suggestion" },
  REDUNDANCY:    { category: "clarity",     severity: "suggestion" },
  CLARITY:       { category: "clarity",     severity: "suggestion" },
  PLAIN_ENGLISH: { category: "clarity",     severity: "suggestion" },
  COLLOQUIALISMS:{ category: "delivery",    severity: "suggestion" },
};

async function checkWithLanguageTool(text: string): Promise<Issue[]> {
  const body = new URLSearchParams({
    text,
    language: "en-US",
    enabledOnly: "false",
    level: "picky",
  });

  const res = await fetch("https://api.languagetool.org/v2/check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`LanguageTool ${res.status}`);

  const data: { matches: LTMatch[] } = await res.json();

  return data.matches.map((m) => {
    const meta = LT_CAT[m.rule.category.id] ?? {
      category: "delivery" as IssueCategory,
      severity: "suggestion" as IssueSeverity,
    };
    return {
      id: nanoid(10),
      category: meta.category,
      severity: meta.severity,
      ruleId: `lt-${m.rule.id}`,
      shortMessage: m.shortMessage || m.rule.category.name,
      message: m.message,
      offset: m.offset,
      length: m.length,
      suggestions: m.replacements.slice(0, 5).map((r) => ({ value: r.value })),
      context: m.context.text,
      contextErrorOffset: m.context.offset,
      contextErrorLength: m.context.length,
    };
  });
}

// ── retext (offline fallback) ────────────────────────────────────────────────

interface RuleMeta {
  category: IssueCategory;
  severity: IssueSeverity;
  shortMessage: string;
}

const RULE_MAP: Record<string, RuleMeta> = {
  "retext-spell":             { category: "correctness", severity: "error",      shortMessage: "Spelling" },
  "retext-repeated-words":    { category: "correctness", severity: "error",      shortMessage: "Repeated word" },
  "retext-indefinite-article":{ category: "correctness", severity: "error",      shortMessage: "Article (a/an)" },
  "retext-sentence-spacing":  { category: "correctness", severity: "warning",    shortMessage: "Sentence spacing" },
  "retext-redundant-acronyms":{ category: "clarity",     severity: "suggestion", shortMessage: "Redundant acronym" },
  "retext-contractions":      { category: "clarity",     severity: "suggestion", shortMessage: "Contraction" },
  "retext-quotes":            { category: "correctness", severity: "warning",    shortMessage: "Quote style" },
  "retext-equality":          { category: "delivery",    severity: "suggestion", shortMessage: "Inclusive language" },
  "retext-passive":           { category: "engagement",  severity: "suggestion", shortMessage: "Passive voice" },
  "retext-readability":       { category: "clarity",     severity: "suggestion", shortMessage: "Hard to read" },
  "retext-simplify":          { category: "clarity",     severity: "suggestion", shortMessage: "Wordy phrase" },
  "retext-intensify":         { category: "engagement",  severity: "suggestion", shortMessage: "Weak word" },
};

function getMeta(source?: string | null): RuleMeta {
  if (source && RULE_MAP[source]) return RULE_MAP[source];
  return { category: "engagement", severity: "suggestion", shortMessage: "Suggestion" };
}

let dictionaryPromise: Promise<{ aff: string; dic: string }> | null = null;
async function loadDictionary() {
  if (!dictionaryPromise) {
    const affUrl = chrome.runtime.getURL("dict/index.aff");
    const dicUrl = chrome.runtime.getURL("dict/index.dic");
    dictionaryPromise = Promise.all([
      fetch(affUrl).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${affUrl}: ${r.status}`);
        return r.text();
      }),
      fetch(dicUrl).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${dicUrl}: ${r.status}`);
        return r.text();
      }),
    ])
      .then(([aff, dic]) => ({ aff, dic }))
      .catch((err) => {
        dictionaryPromise = null;
        throw err;
      });
  }
  return dictionaryPromise;
}

const processorCache = new Map<string, any>();

function buildProcessor(personal: string[], formality: Formality) {
  const dictionaryCallback = (
    cb: (err: Error | null, dict?: { aff: string; dic: string }) => void,
  ) => {
    loadDictionary().then(
      (dict) => cb(null, dict),
      (err) => cb(err instanceof Error ? err : new Error(String(err))),
    );
  };

  const p = unified()
    .use(retextEnglish)
    .use(retextSpell, {
      dictionary: dictionaryCallback,
      max: 3,
      personal: personal.length ? personal.join("\n") : undefined,
    } as any)
    .use(retextRepeatedWords)
    .use(retextIndefiniteArticle)
    .use(retextSentenceSpacing)
    .use(retextRedundantAcronyms)
    .use(retextQuotes)
    .use(retextEquality)
    .use(retextPassive)
    .use(retextReadability, { age: 18 })
    .use(retextSimplify)
    .use(retextIntensify);

  if (formality === "formal") {
    p.use(retextContractions, { straight: true } as any);
  }

  return p.use(retextStringify);
}

function getProcessor(personal: string[], formality: Formality): any {
  const cacheKey = `${formality}:${personal.join(",")}`;
  let processor = processorCache.get(cacheKey);
  if (!processor) {
    processor = buildProcessor(personal, formality);
    processorCache.set(cacheKey, processor);
  }
  return processor;
}

async function checkWithRetext(
  text: string,
  personal: string[],
  formality: Formality,
): Promise<Issue[]> {
  const processor = getProcessor(personal, formality);
  const file = await processor.process(text);

  const issues: Issue[] = [];
  for (const m of file.messages as Array<{
    place?: any;
    source?: string | null;
    ruleId?: string | null;
    expected?: string[];
    reason: string;
  }>) {
    const startOffset =
      m.place && "start" in m.place ? m.place.start.offset : m.place?.offset;
    const endOffset =
      m.place && "start" in m.place ? m.place.end.offset : m.place?.offset;
    if (startOffset == null || endOffset == null) continue;

    const length = Math.max(1, endOffset - startOffset);
    const meta = getMeta(m.source);
    const contextStart = Math.max(0, startOffset - 20);
    const suggestions = (m.expected ?? []).slice(0, 5).map((value: string) => ({ value }));

    issues.push({
      id: nanoid(10),
      category: meta.category,
      severity: meta.severity,
      ruleId: m.ruleId ?? m.source ?? "unknown",
      shortMessage: meta.shortMessage,
      message: m.reason,
      offset: startOffset,
      length,
      suggestions,
      context: text.slice(contextStart, Math.min(text.length, endOffset + 20)),
      contextErrorOffset: startOffset - contextStart,
      contextErrorLength: length,
    });
  }
  return issues;
}

// ── public API ────────────────────────────────────────────────────────────────

export async function checkText(
  text: string,
  options: { formality?: Formality; personal?: string[] } = {},
): Promise<{ issues: Issue[]; durationMs: number }> {
  const formality = options.formality ?? "neutral";
  const personal = options.personal ?? [];
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();

  if (text.trim().length === 0) return { issues: [], durationMs: 0 };

  let issues: Issue[];
  try {
    issues = await checkWithLanguageTool(text);
    console.log("[wr-bg] LanguageTool found", issues.length, "issues");
  } catch (err) {
    console.warn("[wr-bg] LanguageTool failed, falling back to retext:", err);
    issues = await checkWithRetext(text, personal, formality);
  }

  const end = typeof performance !== "undefined" ? performance.now() : Date.now();
  return { issues, durationMs: end - start };
}

export function invalidateProcessorCache() {
  processorCache.clear();
}
