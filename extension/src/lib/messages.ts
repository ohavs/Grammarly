import type { Issue, Formality } from "@writeright/shared";

export interface CheckRequest {
  type: "check";
  text: string;
  formality?: Formality;
  language?: string;
}

export interface CheckResponse {
  type: "check-result";
  issues: Issue[];
  durationMs: number;
}

export interface CheckErrorResponse {
  type: "check-error";
  error: string;
}

export interface SettingsRequest {
  type: "get-settings";
}

export interface SettingsResponse {
  type: "settings";
  enabled: boolean;
  formality: Formality;
  personalDictionary: string[];
  geminiApiKey: string;
}

export interface UpdateSettingsRequest {
  type: "update-settings";
  patch: Partial<{
    enabled: boolean;
    formality: Formality;
    geminiApiKey: string;
  }>;
}

export interface AddPersonalWordRequest {
  type: "add-personal-word";
  word: string;
}

export interface RemovePersonalWordRequest {
  type: "remove-personal-word";
  word: string;
}

export type Request =
  | CheckRequest
  | SettingsRequest
  | UpdateSettingsRequest
  | AddPersonalWordRequest
  | RemovePersonalWordRequest;

export type Response =
  | CheckResponse
  | CheckErrorResponse
  | SettingsResponse
  | { type: "ok" };

export function sendMessage<T extends Response>(req: Request): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(req, (res: T | undefined) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      if (!res) {
        reject(new Error("No response from background"));
        return;
      }
      resolve(res);
    });
  });
}
