import { checkText, invalidateProcessorCache } from "../lib/checker";
import {
  getSettings,
  saveSettings,
  addPersonalWord,
  removePersonalWord,
} from "../lib/storage";
import type { Request, Response } from "../lib/messages";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[wr-bg] installed");
});

chrome.runtime.onMessage.addListener(
  (req: Request, _sender, sendResponse: (r: Response) => void) => {
    handle(req)
      .then(sendResponse)
      .catch((err) => {
        console.error("[wr-bg] error", err);
        sendResponse({ type: "check-error", error: String(err) });
      });
    return true;
  },
);

async function handle(req: Request): Promise<Response> {
  switch (req.type) {
    case "check": {
      const settings = await getSettings();
      if (!settings.enabled) {
        return { type: "check-result", issues: [], durationMs: 0 };
      }
      const result = await checkText(req.text, {
        formality: req.formality ?? settings.formality,
        personal: settings.personalDictionary,
        geminiApiKey: settings.geminiApiKey,
      });
      return { type: "check-result", ...result };
    }
    case "get-settings": {
      const s = await getSettings();
      return {
        type: "settings",
        enabled: s.enabled,
        formality: s.formality,
        personalDictionary: s.personalDictionary,
        geminiApiKey: s.geminiApiKey,
      };
    }
    case "update-settings": {
      await saveSettings(req.patch);
      invalidateProcessorCache();
      return { type: "ok" };
    }
    case "add-personal-word": {
      await addPersonalWord(req.word);
      invalidateProcessorCache();
      return { type: "ok" };
    }
    case "remove-personal-word": {
      await removePersonalWord(req.word);
      invalidateProcessorCache();
      return { type: "ok" };
    }
  }
}
