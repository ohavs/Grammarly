import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { sendMessage } from "../lib/messages";
import type { SettingsResponse } from "../lib/messages";
import type { Formality } from "@writeright/shared";
import "./popup.css";

const FORMALITIES: Formality[] = ["informal", "neutral", "formal"];
const SNOOZE_PRESETS = [5, 10, 15, 30, 60];

function Popup() {
  const [enabled, setEnabled] = useState(true);
  const [formality, setFormality] = useState<Formality>("neutral");
  const [dictionary, setDictionary] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [snoozeMinutes, setSnoozeMinutes] = useState(10);
  const [snoozeInput, setSnoozeInput] = useState("10");
  const [snoozeSaved, setSnoozeSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    sendMessage<SettingsResponse>({ type: "get-settings" })
      .then((res) => {
        setEnabled(res.enabled);
        setFormality(res.formality);
        setDictionary(res.personalDictionary);
        setApiKey(res.geminiApiKey ?? "");
        const mins = res.snoozeMinutes ?? 10;
        setSnoozeMinutes(mins);
        setSnoozeInput(String(mins));
        setLoaded(true);
      })
      .catch((err) => {
        console.error("[wr-popup] failed to load settings", err);
        setLoaded(true);
      });
  }, []);

  async function saveApiKey(e: Event) {
    e.preventDefault();
    await sendMessage({
      type: "update-settings",
      patch: { geminiApiKey: apiKey.trim() },
    });
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 1500);
  }

  async function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    await sendMessage({ type: "update-settings", patch: { enabled: next } });
  }

  async function setFormalityValue(value: Formality) {
    setFormality(value);
    await sendMessage({
      type: "update-settings",
      patch: { formality: value },
    });
  }

  async function saveSnoozeMinutes(mins: number) {
    const clamped = Math.max(1, Math.min(1440, mins));
    setSnoozeMinutes(clamped);
    setSnoozeInput(String(clamped));
    await sendMessage({ type: "update-settings", patch: { snoozeMinutes: clamped } });
    setSnoozeSaved(true);
    setTimeout(() => setSnoozeSaved(false), 1500);
  }

  async function handleSnoozeSubmit(e: Event) {
    e.preventDefault();
    const parsed = parseInt(snoozeInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      await saveSnoozeMinutes(parsed);
    }
  }

  async function addWord(e: Event) {
    e.preventDefault();
    const w = newWord.trim();
    if (!w) return;
    await sendMessage({ type: "add-personal-word", word: w });
    setDictionary((prev) => (prev.includes(w) ? prev : [...prev, w]));
    setNewWord("");
  }

  async function removeWord(word: string) {
    setDictionary((prev) => prev.filter((w) => w !== word));
    await sendMessage({ type: "remove-personal-word", word });
  }

  if (!loaded) {
    return (
      <div className="popup">
        <div className="section">Loading…</div>
      </div>
    );
  }

  return (
    <div className="popup">
      <div className="popup-header">
        <div className="popup-title">
          <span className="popup-title-mark">WR</span>
          <span>WriteRight</span>
        </div>
        <button
          className="toggle"
          aria-checked={enabled}
          onClick={toggleEnabled}
          aria-label={enabled ? "Disable" : "Enable"}
        />
      </div>

      <div className="section">
        <h3>Formality</h3>
        <div className="formality">
          {FORMALITIES.map((f) => (
            <button
              key={f}
              data-active={formality === f}
              onClick={() => setFormalityValue(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>Snooze duration</h3>
        <div className="snooze-presets">
          {SNOOZE_PRESETS.map((m) => (
            <button
              key={m}
              data-active={snoozeMinutes === m}
              onClick={() => saveSnoozeMinutes(m)}
            >
              {m}m
            </button>
          ))}
        </div>
        <form onSubmit={handleSnoozeSubmit} className="snooze-form">
          <input
            type="number"
            min="1"
            max="1440"
            value={snoozeInput}
            onInput={(e) => setSnoozeInput((e.target as HTMLInputElement).value)}
          />
          <span className="snooze-unit">דקות</span>
          <button type="submit">{snoozeSaved ? "נשמר ✓" : "שמור"}</button>
        </form>
      </div>

      <div className="section">
        <h3>AI grammar (Gemini)</h3>
        <form onSubmit={saveApiKey} className="apikey-form">
          <input
            type="password"
            value={apiKey}
            onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
            placeholder="Paste Gemini API key…"
          />
          <button type="submit">{apiKeySaved ? "Saved ✓" : "Save"}</button>
        </form>
        <div className="apikey-help">
          Free key:{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            aistudio.google.com/app/apikey
          </a>
          . Stored locally only. Without a key, falls back to LanguageTool.
        </div>
      </div>

      <div className="section">
        <h3>Personal dictionary</h3>
        <div className="dictionary">
          <ul>
            {dictionary.length === 0 && (
              <li style={{ color: "#94a3b8" }}>No custom words yet.</li>
            )}
            {dictionary.map((w) => (
              <li key={w}>
                <span>{w}</span>
                <button
                  type="button"
                  aria-label={`Remove ${w}`}
                  onClick={() => removeWord(w)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addWord}>
            <input
              value={newWord}
              onInput={(e) =>
                setNewWord((e.target as HTMLInputElement).value)
              }
              placeholder="Add a word…"
            />
            <button type="submit">Add</button>
          </form>
        </div>
      </div>

      <div className="footer">
        {apiKey
          ? "Text is sent to Gemini for AI grammar checking."
          : "WriteRight runs locally. Add a Gemini key for full AI corrections."}
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) render(<Popup />, root);
