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
import dictionaryEn from "dictionary-en";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import type {
  CheckResponse,
  Formality,
  Issue,
  IssueCategory,
  IssueSeverity,
  UserSettings,
} from "@writeright/shared";

interface RuleMeta {
  category: IssueCategory;
  severity: IssueSeverity;
  shortMessage: string;
}

const RULE_MAP: Record<string, RuleMeta> = {
  "retext-spell": {
    category: "correctness",
    severity: "error",
    shortMessage: "Spelling",
  },
  "retext-repeated-words": {
    category: "correctness",
    severity: "error",
    shortMessage: "Repeated word",
  },
  "retext-indefinite-article": {
    category: "correctness",
    severity: "error",
    shortMessage: "Article (a/an)",
  },
  "retext-sentence-spacing": {
    category: "correctness",
    severity: "warning",
    shortMessage: "Sentence spacing",
  },
  "retext-redundant-acronyms": {
    category: "clarity",
    severity: "suggestion",
    shortMessage: "Redundant acronym",
  },
  "retext-contractions": {
    category: "clarity",
    severity: "suggestion",
    shortMessage: "Contraction",
  },
  "retext-quotes": {
    category: "correctness",
    severity: "warning",
    shortMessage: "Quote style",
  },
  "retext-equality": {
    category: "delivery",
    severity: "suggestion",
    shortMessage: "Inclusive language",
  },
  "retext-passive": {
    category: "engagement",
    severity: "suggestion",
    shortMessage: "Passive voice",
  },
  "retext-readability": {
    category: "clarity",
    severity: "suggestion",
    shortMessage: "Hard to read",
  },
  "retext-simplify": {
    category: "clarity",
    severity: "suggestion",
    shortMessage: "Wordy phrase",
  },
  "retext-intensify": {
    category: "engagement",
    severity: "suggestion",
    shortMessage: "Weak word",
  },
};

function getMeta(source?: string | null): RuleMeta {
  if (source && RULE_MAP[source]) return RULE_MAP[source];
  return {
    category: "engagement",
    severity: "suggestion",
    shortMessage: "Suggestion",
  };
}

function buildProcessor(personal: string[], formality: Formality) {
  const p = unified()
    .use(retextEnglish)
    .use(retextSpell, {
      dictionary: dictionaryEn,
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

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
function hashText(
  text: string,
  language: string,
  extra: string,
): string {
  return createHash("sha256")
    .update(`${language}:${extra}:${text}`)
    .digest("hex");
}

const getCache = db.prepare(
  "SELECT response, created_at FROM check_cache WHERE text_hash = ?",
);
const setCache = db.prepare(
  "INSERT OR REPLACE INTO check_cache (text_hash, language, response, created_at) VALUES (?, ?, ?, ?)",
);

const DEFAULT_SETTINGS: UserSettings = {
  language: "en-US",
  audience: "general",
  formality: "neutral",
  intent: "inform",
};

export async function checkText(
  text: string,
  options: { settings?: UserSettings; personal?: string[] } = {},
): Promise<CheckResponse> {
  const settings = options.settings ?? DEFAULT_SETTINGS;
  const personal = options.personal ?? [];

  const start = Date.now();
  if (text.trim().length === 0) {
    return { issues: [], language: settings.language, durationMs: 0 };
  }

  const extra = `${settings.formality}:${personal.join(",")}`;
  const hash = hashText(text, settings.language, extra);
  const cached = getCache.get(hash) as
    | { response: string; created_at: number }
    | undefined;
  if (cached && Date.now() - cached.created_at < CACHE_TTL_MS) {
    const issues = JSON.parse(cached.response) as Issue[];
    return {
      issues,
      language: settings.language,
      durationMs: Date.now() - start,
    };
  }

  const processor = buildProcessor(personal, settings.formality);
  const file = await processor.process(text);

  const issues: Issue[] = [];
  for (const m of file.messages) {
    const startOffset = m.place
      ? "start" in m.place
        ? m.place.start.offset
        : m.place.offset
      : undefined;
    const endOffset = m.place
      ? "start" in m.place
        ? m.place.end.offset
        : m.place.offset
      : undefined;
    if (startOffset == null || endOffset == null) continue;

    const length = Math.max(1, endOffset - startOffset);
    const meta = getMeta(m.source);
    const suggestions = (m.expected ?? []).slice(0, 5).map((value) => ({
      value,
    }));

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
      context: text.slice(
        Math.max(0, startOffset - 20),
        Math.min(text.length, endOffset + 20),
      ),
    });
  }

  setCache.run(hash, settings.language, JSON.stringify(issues), Date.now());

  return {
    issues,
    language: settings.language,
    durationMs: Date.now() - start,
  };
}
