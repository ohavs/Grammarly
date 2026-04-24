export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  uniqueWords: number;
  sentences: number;
  paragraphs: number;
  readingTimeSec: number;
  speakingTimeSec: number;
  avgWordLength: number;
  avgSentenceLength: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  readabilityLabel: string;
}

const VOWELS = /[aeiouy]+/g;

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  const matches = trimmed.match(VOWELS);
  return Math.max(1, matches ? matches.length : 1);
}

function readabilityLabel(score: number): string {
  if (score >= 90) return "Very easy";
  if (score >= 80) return "Easy";
  if (score >= 70) return "Fairly easy";
  if (score >= 60) return "Standard";
  if (score >= 50) return "Fairly difficult";
  if (score >= 30) return "Difficult";
  return "Very confusing";
}

export function computeStats(text: string): TextStats {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;

  const wordTokens = text.match(/\b[\p{L}\p{N}']+\b/gu) ?? [];
  const words = wordTokens.length;
  const uniqueWords = new Set(wordTokens.map((w) => w.toLowerCase())).size;

  const sentenceTokens = text
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentences = Math.max(1, sentenceTokens.length);

  const paragraphs = Math.max(
    1,
    text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean).length,
  );

  const totalSyllables = wordTokens.reduce(
    (sum, w) => sum + countSyllables(w),
    0,
  );
  const totalChars = wordTokens.reduce((sum, w) => sum + w.length, 0);
  const avgWordLength = words ? totalChars / words : 0;
  const avgSentenceLength = words / sentences;

  const fleschReadingEase = words
    ? 206.835 -
      1.015 * (words / sentences) -
      84.6 * (totalSyllables / words)
    : 0;
  const fleschKincaidGrade = words
    ? 0.39 * (words / sentences) + 11.8 * (totalSyllables / words) - 15.59
    : 0;

  const readingTimeSec = Math.ceil((words / 238) * 60);
  const speakingTimeSec = Math.ceil((words / 150) * 60);

  return {
    characters,
    charactersNoSpaces,
    words,
    uniqueWords,
    sentences,
    paragraphs,
    readingTimeSec,
    speakingTimeSec,
    avgWordLength: Number(avgWordLength.toFixed(2)),
    avgSentenceLength: Number(avgSentenceLength.toFixed(2)),
    fleschReadingEase: Number(fleschReadingEase.toFixed(1)),
    fleschKincaidGrade: Number(fleschKincaidGrade.toFixed(1)),
    readabilityLabel: readabilityLabel(fleschReadingEase),
  };
}
