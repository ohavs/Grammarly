import type { IssueCategory } from "@writeright/shared";

export const RULE_HE: Record<
  string,
  { label: string; explanation: string }
> = {
  "retext-spell": {
    label: "שגיאת איות",
    explanation: "המילה לא נמצאה במילון.",
  },
  "retext-repeated-words": {
    label: "מילה כפולה",
    explanation: "אותה מילה מופיעה פעמיים ברצף.",
  },
  "retext-indefinite-article": {
    label: "תווית סתמית (a/an)",
    explanation: "צריך a או an לפי הצליל של המילה הבאה.",
  },
  "retext-sentence-spacing": {
    label: "רווח בין משפטים",
    explanation: "מספר רווחים לא עקבי בין משפטים.",
  },
  "retext-redundant-acronyms": {
    label: "ראשי תיבות מיותרים",
    explanation: "הראשי תיבות חוזרים על מילה שכבר נכתבה.",
  },
  "retext-contractions": {
    label: "צורת קיצור",
    explanation: "כדאי להשתמש בצורת ה-contraction (למשל don't במקום do not).",
  },
  "retext-quotes": {
    label: "סגנון מירכאות",
    explanation: "סגנון המירכאות לא תואם להעדפה.",
  },
  "retext-equality": {
    label: "שפה לא מכלילה",
    explanation: "מילה שעלולה להיתפס כלא מכלילה — שקול חלופה ניטרלית.",
  },
  "retext-passive": {
    label: "ניסוח סביל",
    explanation: "ניסוח סביל. שקול ניסוח אקטיבי שיהיה ברור יותר.",
  },
  "retext-readability": {
    label: "קשה לקריאה",
    explanation: "המשפט מורכב יחסית. אולי כדאי לפצל או לפשט.",
  },
  "retext-simplify": {
    label: "ביטוי ארוך",
    explanation: "ביטוי שאפשר להחליף במילה אחת קצרה ופשוטה יותר.",
  },
  "retext-intensify": {
    label: "מילה חלשה",
    explanation: "מילה חלשה או כללית. שקול מילה ספציפית יותר.",
  },
};

export const CATEGORY_HE: Record<IssueCategory, string> = {
  correctness: "תקינות",
  clarity: "בהירות",
  engagement: "מעורבות",
  delivery: "סגנון",
};

export const UI_HE = {
  panelTitle: (count: number) =>
    count === 1 ? "WriteRight — תיקון אחד" : `WriteRight — ${count} תיקונים`,
  noIssues: "אין תיקונים — נקי!",
  analyzing: "בודק…",
  error: "שגיאה בבדיקת הטקסט. ראה Console.",
  dismiss: "התעלם",
};

const LT_CATEGORY_HE: Record<string, string> = {
  GRAMMAR:        "שגיאה דקדוקית",
  TYPOS:          "שגיאת כתיב",
  CONFUSED_WORDS: "מילה מבולבלת",
  CASING:         "אותיות גדולות",
  PUNCTUATION:    "פיסוק",
  COMPOUNDING:    "כתיב מורכב",
  TYPOGRAPHY:     "עיצוב טקסט",
  STYLE:          "סגנון",
  REDUNDANCY:     "מיותר",
  CLARITY:        "בהירות",
  PLAIN_ENGLISH:  "פשטות",
  COLLOQUIALISMS: "סלנג",
};

export function localizeIssue(source: string | null | undefined): {
  label: string;
  explanation: string;
} {
  if (!source) return { label: "הצעה", explanation: "" };
  if (RULE_HE[source]) return RULE_HE[source];
  if (source.startsWith("lt-")) {
    const parts = source.slice(3).split("_");
    const catKey = parts[0] ?? "";
    const label = LT_CATEGORY_HE[catKey] ?? "הצעה";
    return { label, explanation: "" };
  }
  return { label: "הצעה", explanation: "" };
}
