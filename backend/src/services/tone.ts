export interface ToneResult {
  tones: { label: string; score: number }[];
  summary: string;
}

const LEXICONS: Record<string, string[]> = {
  confident: [
    "definitely",
    "certainly",
    "absolutely",
    "clearly",
    "surely",
    "undoubtedly",
    "always",
    "never",
    "must",
    "will",
  ],
  tentative: [
    "maybe",
    "perhaps",
    "possibly",
    "might",
    "could",
    "seems",
    "appears",
    "somewhat",
    "kind of",
    "sort of",
    "i think",
    "i guess",
  ],
  friendly: [
    "thanks",
    "please",
    "appreciate",
    "welcome",
    "glad",
    "happy",
    "love",
    "great",
    "awesome",
    "wonderful",
  ],
  formal: [
    "therefore",
    "furthermore",
    "however",
    "consequently",
    "regarding",
    "hereby",
    "pursuant",
    "shall",
    "thus",
    "whereas",
  ],
  informal: [
    "gonna",
    "wanna",
    "gotta",
    "yeah",
    "nope",
    "stuff",
    "thing",
    "lol",
    "btw",
    "tbh",
  ],
  urgent: [
    "asap",
    "immediately",
    "urgent",
    "now",
    "quickly",
    "hurry",
    "critical",
    "deadline",
  ],
  optimistic: [
    "excited",
    "hopeful",
    "amazing",
    "fantastic",
    "opportunity",
    "success",
    "progress",
    "improve",
  ],
  concerned: [
    "worried",
    "problem",
    "issue",
    "fail",
    "difficult",
    "unfortunately",
    "sadly",
    "risk",
    "concerned",
  ],
};

export function analyzeTone(text: string): ToneResult {
  const lower = text.toLowerCase();
  const words = lower.match(/\b[\p{L}']+\b/gu) ?? [];
  const totalWords = Math.max(1, words.length);

  const scores: { label: string; score: number }[] = [];
  for (const [label, terms] of Object.entries(LEXICONS)) {
    let hits = 0;
    for (const term of terms) {
      if (term.includes(" ")) {
        const re = new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "g");
        hits += (lower.match(re) ?? []).length;
      } else {
        hits += words.filter((w) => w === term).length;
      }
    }
    const score = Number(((hits / totalWords) * 100).toFixed(2));
    if (score > 0) scores.push({ label, score });
  }

  const exclamations = (text.match(/!/g) ?? []).length;
  const questions = (text.match(/\?/g) ?? []).length;
  const allCapsWords = (text.match(/\b[A-Z]{3,}\b/g) ?? []).length;

  if (exclamations / Math.max(1, text.split(/[.!?]/).length) > 0.3) {
    scores.push({ label: "enthusiastic", score: 100 });
  }
  if (allCapsWords > 2) {
    scores.push({ label: "assertive", score: 100 });
  }
  if (questions > 2) {
    scores.push({ label: "inquisitive", score: 100 });
  }

  scores.sort((a, b) => b.score - a.score);

  const top = scores.slice(0, 3);
  const summary = top.length
    ? top.map((t) => t.label).join(", ")
    : "neutral";

  return { tones: top, summary };
}
