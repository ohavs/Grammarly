import { isEditable, getText, type EditableElement } from "./editable";
import { Widget } from "./widget";
import { sendMessage } from "../lib/messages";
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

function ensureWidget(): Widget {
  if (!widget) {
    widget = new Widget({
      onApply: () => {
        triggerAnalysis(true);
      },
      onDismiss: () => {
        // dismissed state lives inside the widget
      },
    });
  }
  return widget;
}

async function loadSettings() {
  try {
    const res = await sendMessage<SettingsResponse>({ type: "get-settings" });
    enabled = res.enabled;
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
