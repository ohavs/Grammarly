export type IssueCategory =
  | "correctness"
  | "clarity"
  | "engagement"
  | "delivery";

export type IssueSeverity = "error" | "warning" | "suggestion";

export interface Suggestion {
  value: string;
}

export interface Issue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  ruleId: string;
  shortMessage: string;
  message: string;
  offset: number;
  length: number;
  suggestions: Suggestion[];
  context?: string;
}

export interface CheckRequest {
  text: string;
  language?: string;
}

export interface CheckResponse {
  issues: Issue[];
  language: string;
  durationMs: number;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
