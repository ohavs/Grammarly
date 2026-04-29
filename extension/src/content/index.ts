import { isEditable, getText, type EditableElement } from "./editable";
import { Widget } from "./widget";
import { sendMessage } from "../lib/messages";
import { getSnoozeUntil, setSnoozeUntil } from "../lib/storage";
import type {
  CheckResponse,
  CheckErrorResponse,
  SettingsResponse,
} from "../lib/messages";
import "./styles.css";

console.log(
  "[wr] content script loaded",
  location.href,
  window === window.top ? "(top)" : "(frame)",
);

const DEBOUNCE_MS = 600;
const MIN_TEXT_LENGTH = 1;

let widget: Widget | null = null;
let activeTarget: EditableElement | null = null;
let analyzeTimer: number | null = null;
let analysisSeq = 0;
let enabled = true;
let snoozeMinutes = 10;
let snoozeTimer: number | null = null;

function ensureWidget(): Widget {
  if (!widget) {
    widget = new Widget({
      onApply: () => {
        triggerAnalysis(true);
      },
      onDismiss: () => {
        // dismissed state lives inside the widget
      },
      onSnooze: handleSnooze,
    });
  }
  return widget;
}

async function handleSnooze() {
  const until = Date.now() + snoozeMinutes * 60_000;
  await setSnoozeUntil(until);
  enabled = false;
  activeTarget = null;
  if (widget) {
    widget.setState("off");
    widget.detach();
  }
  scheduleSnoozeWakeup(until);
  console.log(`[wr] snoozed for ${snoozeMinutes} min until`, new Date(until).toLocaleTimeString());
}

function scheduleSnoozeWakeup(until: number) {
  if (snoozeTimer !== null) {
    clearTimeout(snoozeTimer);
    snoozeTimer = null;
  }
  const remaining = until - Date.now();
  if (remaining <= 0) return;
  snoozeTimer = window.setTimeout(async () => {
    snoozeTimer = null;
    await setSnoozeUntil(0);
    enabled = true;
    console.log("[wr] snooze ended, re-enabling");
    // Re-attach if there's a currently focused editable
    const el = document.activeElement;
    if (el && isEditable(el)) {
      activeTarget = el;
      ensureWidget().attach(el);
      triggerAnalysis(true);
    }
  }, remaining);
}

async function loadSettings() {
  try {
    const res = await sendMessage<SettingsResponse>({ type: "get-settings" });
    enabled = res.enabled;
    snoozeMinutes = res.snoozeMinutes ?? 10;

    // Check if we're currently in a snooze period
    const snoozeUntil = await getSnoozeUntil();
    if (snoozeUntil > Date.now()) {
      enabled = false;
      scheduleSnoozeWakeup(snoozeUntil);
    }

    if (!enabled && widget) {
      widget.setState("off");
    }
  } catch (err) {
    console.warn("[wr] failed to load settings", err);
  }
}

function triggerAnalysis(immediate = false) {
  if (analyzeTimer) {
    clearTimeout(analyzeTimer);
    analyzeTimer = null;
  }
  if (!activeTarget || !enabled) return;
  const run = () => {
    if (!activeTarget) return;
    const text = getText(activeTarget);
    if (text.length < MIN_TEXT_LENGTH) {
      ensureWidget().setIssues([]);
      ensureWidget().setState("clean");
      return;
    }
    const seq = ++analysisSeq;
    ensureWidget().setState("loading");
    sendMessage<CheckResponse | CheckErrorResponse>({
      type: "check",
      text,
    })
      .then((res) => {
        if (seq !== analysisSeq) return;
        if (res.type === "check-error") {
          console.warn("[wr] check error", res.error);
          ensureWidget().setState("error");
          return;
        }
        ensureWidget().setIssues(res.issues);
      })
      .catch((err) => {
        if (seq !== analysisSeq) return;
        const msg = String(err?.message ?? err);
        if (msg.includes("Extension context invalidated") || msg.includes("context invalidated")) {
          return;
        }
        console.warn("[wr] check failed", err);
        ensureWidget().setState("error");
      });
  };
  if (immediate) {
    run();
  } else {
    analyzeTimer = window.setTimeout(run, DEBOUNCE_MS);
  }
}

function onFocusIn(e: FocusEvent) {
  if (!enabled) return;
  const t = e.target;
  console.log("[wr] focusin", (t as Element)?.tagName, (t as Element)?.className?.slice?.(0, 60));
  if (!isEditable(t)) {
    console.log("[wr] not editable, skipping");
    return;
  }
  if ((t as Element).closest?.("[data-wr]")) return;
  console.log("[wr] attaching to", (t as Element).tagName);
  activeTarget = t;
  ensureWidget().attach(t);
  triggerAnalysis(true);
}

function onFocusOut(e: FocusEvent) {
  const t = e.target;
  if (!isEditable(t)) return;
  setTimeout(() => {
    if (document.activeElement && isEditable(document.activeElement)) {
      return;
    }
    if (
      document.activeElement &&
      (document.activeElement as HTMLElement).closest?.("[data-wr]")
    ) {
      return;
    }
    if (activeTarget === t) {
      activeTarget = null;
      ensureWidget().detach();
    }
  }, 50);
}

function onInput(e: Event) {
  const t = e.target;
  if (!isEditable(t)) return;
  if (t !== activeTarget) return;
  triggerAnalysis(false);
}

document.addEventListener("focusin", onFocusIn, true);
document.addEventListener("focusout", onFocusOut, true);
document.addEventListener("input", onInput, true);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "settings-updated") {
    loadSettings();
    if (activeTarget) triggerAnalysis(true);
  }
});

// Catch already-focused element (script loaded after user focused a field)
function checkAlreadyFocused() {
  const el = document.activeElement;
  if (el && isEditable(el)) {
    console.log("[wr] already-focused editable on load", el.tagName);
    activeTarget = el;
    ensureWidget().attach(el);
    triggerAnalysis(true);
  }
}

// Watch for editable elements added dynamically (e.g. Gmail compose)
const observer = new MutationObserver(() => {
  const el = document.activeElement;
  if (el && isEditable(el) && el !== activeTarget) {
    console.log("[wr] mutation: new active editable", el.tagName);
    activeTarget = el;
    ensureWidget().attach(el);
    triggerAnalysis(true);
  }
});
observer.observe(document.body ?? document.documentElement, {
  childList: true,
  subtree: true,
});

loadSettings();
checkAlreadyFocused();
