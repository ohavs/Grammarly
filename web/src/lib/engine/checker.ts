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
const affUrl = `${import.meta.env.BASE_URL}dict/index.aff`;
const dicUrl = `${import.meta.env.BASE_URL}dict/index.dic`;
import type {
  CheckResponse,
  Formality,
  Issue,
  IssueCategory,
  IssueSeverity,
} from "@writeright/shared";

interface RuleMeta {
  category: IssueCategory;
  severity: IssueSeverity;
  shortMessage: string;
}

const RULE_MAP: Record<string, RuleMeta> = {
  "retext-spell": { category: "correctness", severity: "error", shortMessage: "Spelling" },
  "retext-repeated-words": { category: "correctness", severity: "error", shortMessage: "Repeated word" },
  "retext-indefinite-article": { category: "correctness", severity: "error", shortMessage: "Article (a/an)" },
  "retext-sentence-spacing": { category: "correctness", severity: "warning", shortMessage: "Sentence spacing" },
  "retext-redundant-acronyms": { category: "clarity", severity: "suggestion", shortMessage: "Redundant acronym" },
  "retext-contractions": { category: "clarity", severity: "suggestion", shortMessage: "Contraction" },
  "retext-quotes": { category: "correctness", severity: "warning", shortMessage: "Quote style" },
  "retext-equality": { category: "delivery", severity: "suggestion", shortMessage: "Inclusive language" },
  "retext-passive": { category: "engagement", severity: "suggestion", shortMessage: "Passive voice" },
  "retext-readability": { category: "clarity", severity: "suggestion", shortMessage: "Hard to read" },
  "retext-simplify": { category: "clarity", severity: "suggestion", shortMessage: "Wordy phrase" },
  "retext-intensify": { category: "engagement", severity: "suggestion", shortMessage: "Weak word" },
};

function getMeta(source?: string | null): RuleMeta {
  if (source && RULE_MAP[source]) return RULE_MAP[source];
  return { category: "engagement", severity: "suggestion", shortMessage: "Suggestion" };
}

let dictionaryPromise: Promise<{ aff: string; dic: string }> | null = null;
async function loadDictionary() {
  if (!dictionaryPromise) {
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
        console.error("[checker] dictionary load failed", err);
        throw err;
      });
  }
  return dictionaryPromise;
}

interface ProcessorKey {
  personalKey: string;
  formality: Formality;
}

const processorCache = new Map<string, Promise<any>>();

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

function getProcessor(key: ProcessorKey, personal: string[]): Promise<any> {
  const cacheKey = `${key.formality}:${key.personalKey}`;
  let promise = processorCache.get(cacheKey);
  if (!promise) {
    promise = Promise.resolve(buildProcessor(personal, key.formality));
    processorCache.set(cacheKey, promise);
  }
  return promise;
}

export async function checkText(
  text: string,
  options: { language?: string; formality?: Formality; personal?: string[] } = {},
): Promise<CheckResponse> {
  const language = options.language ?? "en-US";
  const formality = options.formality ?? "neutral";
  const personal = options.personal ?? [];
  const start = performance.now();

  if (text.trim().length === 0) {
    return { issues: [], language, durationMs: 0 };
  }

  const processor = await getProcessor(
    { personalKey: personal.join(","), formality },
    personal,
  );
  let file: any;
  try {
    file = await processor.process(text);
  } catch (err) {
    console.error("[checker] processor.process failed", err);
    throw err;
  }
  if (file.messages.length === 0) {
    console.debug("[checker] no issues found", {
      length: text.length,
      sample: text.slice(0, 60),
    });
  } else {
    console.debug("[checker] found", file.messages.length, "issues");
  }

  const issues: Issue[] = [];
  for (const m of file.messages) {
    const startOffset =
      m.place && "start" in m.place
        ? (m.place as any).start.offset
        : (m.place as any)?.offset;
    const endOffset =
      m.place && "start" in m.place
        ? (m.place as any).end.offset
        : (m.place as any)?.offset;
    if (startOffset == null || endOffset == null) continue;

    const length = Math.max(1, endOffset - startOffset);
    const meta = getMeta(m.source);
    const suggestions = (m.expected ?? []).slice(0, 5).map((value: string) => ({
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

  return { issues, language, durationMs: performance.now() - start };
}

export function invalidateProcessorCache() {
  processorCache.clear();
}
