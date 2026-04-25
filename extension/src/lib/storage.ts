import type { Formality } from "@writeright/shared";

export interface ExtensionSettings {
  enabled: boolean;
  formality: Formality;
  personalDictionary: string[];
}

const DEFAULTS: ExtensionSettings = {
  enabled: true,
  formality: "neutral",
  personalDictionary: [],
};

const KEY = "wr_settings";

export async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEY, (data) => {
      const stored = data[KEY] as Partial<ExtensionSettings> | undefined;
      resolve({ ...DEFAULTS, ...(stored ?? {}) });
    });
  });
}

export async function saveSettings(
  patch: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEY]: next }, () => resolve(next));
  });
}

export async function addPersonalWord(word: string): Promise<string[]> {
  const current = await getSettings();
  const trimmed = word.trim();
  if (!trimmed) return current.personalDictionary;
  if (current.personalDictionary.includes(trimmed)) {
    return current.personalDictionary;
  }
  const next = [...current.personalDictionary, trimmed];
  await saveSettings({ personalDictionary: next });
  return next;
}

export async function removePersonalWord(word: string): Promise<string[]> {
  const current = await getSettings();
  const next = current.personalDictionary.filter((w) => w !== word);
  await saveSettings({ personalDictionary: next });
  return next;
}
