import type { Issue } from "@writeright/shared";
import { replaceRange, type EditableElement } from "./editable";
import { localizeIssue, UI_HE } from "./i18n";

export type WidgetState = "loading" | "clean" | "issues" | "error" | "off";

interface WidgetCallbacks {
  onApply(issue: Issue, replacement: string): void;
  onDismiss(issue: Issue): void;
}

const STATE_COLORS: Record<WidgetState, string> = {
  loading: "#64748b",
  clean: "#16a34a",
  issues: "#ef4444",
  error: "#dc2626",
  off: "#94a3b8",
};

function applyButtonStyles(btn: HTMLButtonElement) {
  const set = (k: string, v: string) => btn.style.setProperty(k, v, "important");
  set("position", "fixed");
  set("top", "0");
  set("left", "0");
  set("display", "none");
  set("align-items", "center");
  set("justify-content", "center");
  set("height", "24px");
  set("min-width", "24px");
  set("padding", "0 6px");
  set("margin", "0");
  set("border", "none");
  set("border-radius", "12px");
  set("background", "#64748b");
  set("color", "#ffffff");
  set("font", "600 11px/24px system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif");
  set("cursor", "pointer");
  set("box-shadow", "0 2px 8px rgba(0,0,0,.25)");
  set("user-select", "none");
  set("z-index", "2147483647");
  set("box-sizing", "border-box");
  set("opacity", "1");
  set("visibility", "visible");
  set("pointer-events", "auto");
  set("transform", "none");
  set("clip", "auto");
  set("clip-path", "none");
  set("filter", "none");
  set("text-indent", "0");
  set("letter-spacing", "0.02em");
  set("text-transform", "none");
  set("min-height", "24px");
  set("max-width", "none");
  set("max-height", "none");
  set("white-space", "nowrap");
}

function applyPanelStyles(panel: HTMLDivElement) {
  const set = (k: string, v: string) => panel.style.setProperty(k, v, "important");
  set("position", "fixed");
  set("top", "0");
  set("left", "0");
  set("width", "320px");
  set("max-height", "420px");
  set("overflow", "hidden");
  set("background", "#ffffff");
  set("color", "#0f172a");
  set("border", "1px solid #e2e8f0");
  set("border-radius", "10px");
  set("box-shadow", "0 12px 32px rgba(15,23,42,.18)");
  set("font", "13px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif");
  set("display", "flex");
  set("flex-direction", "column");
  set("z-index", "2147483647");
  set("opacity", "1");
  set("visibility", "visible");
  set("pointer-events", "auto");
  set("transform", "none");
  set("clip", "auto");
  set("clip-path", "none");
  set("filter", "none");
  set("margin", "0");
  set("box-sizing", "border-box");
}

export class Widget {
  private button: HTMLButtonElement;
  private panel: HTMLDivElement | null = null;
  private state: WidgetState = "loading";
  private issues: Issue[] = [];
  private dismissed = new Set<string>();
  private target: EditableElement | null = null;
  private cb: WidgetCallbacks;
  private isPanelOpen = false;
  private repositionRaf = 0;

  constructor(cb: WidgetCallbacks) {
    this.cb = cb;

    this.button = document.createElement("button");
    this.button.setAttribute("data-wr", "true");
    this.button.type = "button";
    this.button.dataset.state = "loading";
    this.button.innerHTML =
      '<span style="font-weight:800">WR</span><span data-wr-count style="margin-left:4px;font-weight:700" hidden></span>';

    applyButtonStyles(this.button);

    this.button.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    this.button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePanel();
    });

    document.documentElement.appendChild(this.button);
    console.log("[wr] widget button appended", this.button);

    window.addEventListener("scroll", this.scheduleReposition, true);
    window.addEventListener("resize", this.scheduleReposition);
  }

  attach(target: EditableElement) {
    if (this.target === target) return;
    this.target = target;
    this.button.style.setProperty("display", "inline-flex", "important");
    this.reposition();
  }

  detach() {
    this.target = null;
    this.button.style.setProperty("display", "none", "important");
    this.closePanel();
  }

  setState(state: WidgetState) {
    this.state = state;
    this.button.dataset.state = state;
    this.button.style.setProperty("background", STATE_COLORS[state], "important");
    this.updateCount();
  }

  setIssues(issues: Issue[]) {
    this.issues = issues;
    this.dismissed = new Set(
      [...this.dismissed].filter((id) => issues.some((i) => i.id === id)),
    );
    const visible = this.visibleIssues();
    this.setState(visible.length === 0 ? "clean" : "issues");
    if (this.isPanelOpen) this.renderPanel();
  }

  destroy() {
    window.removeEventListener("scroll", this.scheduleReposition, true);
    window.removeEventListener("resize", this.scheduleReposition);
    this.button.remove();
    if (this.panel) this.panel.remove();
  }

  private visibleIssues(): Issue[] {
    return this.issues.filter((i) => !this.dismissed.has(i.id));
  }

  private updateCount() {
    const count = this.visibleIssues().length;
    const span = this.button.querySelector("[data-wr-count]") as HTMLSpanElement;
    if (count > 0 && this.state === "issues") {
      span.textContent = String(count);
      span.removeAttribute("hidden");
    } else {
      span.setAttribute("hidden", "");
    }
  }

  private scheduleReposition = () => {
    if (this.repositionRaf) return;
    this.repositionRaf = requestAnimationFrame(() => {
      this.repositionRaf = 0;
      this.reposition();
    });
  };

  private reposition() {
    if (!this.target) return;
    const rect = this.target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.button.style.setProperty("display", "none", "important");
      return;
    }
    this.button.style.setProperty("display", "inline-flex", "important");
    const top = rect.bottom - 28;
    const left = rect.right - 36;
    this.button.style.setProperty("top", `${top}px`, "important");
    this.button.style.setProperty("left", `${left}px`, "important");
    console.log(`[wr] reposition top=${top} left=${left} rect=`, rect);
    if (this.panel && this.isPanelOpen) {
      this.positionPanel();
    }
  }

  private togglePanel() {
    if (this.isPanelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  private openPanel() {
    if (!this.panel) {
      this.panel = document.createElement("div");
      this.panel.setAttribute("data-wr", "true");
      this.panel.className = "wr-panel";
      this.panel.dir = "rtl";
      this.panel.lang = "he";
      applyPanelStyles(this.panel);
      this.panel.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      document.documentElement.appendChild(this.panel);
    }
    this.isPanelOpen = true;
    this.renderPanel();
    this.positionPanel();
    document.addEventListener("mousedown", this.onOutsideMouseDown, true);
  }

  private closePanel() {
    this.isPanelOpen = false;
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    document.removeEventListener("mousedown", this.onOutsideMouseDown, true);
  }

  private onOutsideMouseDown = (e: MouseEvent) => {
    if (!this.panel) return;
    const t = e.target as Node;
    if (this.panel.contains(t) || this.button.contains(t)) return;
    this.closePanel();
  };

  private positionPanel() {
    if (!this.panel || !this.target) return;
    const rect = this.target.getBoundingClientRect();
    const panelHeight = this.panel.offsetHeight || 200;
    const panelWidth = this.panel.offsetWidth || 320;
    const viewportH = window.innerHeight;

    let top = rect.bottom + 6;
    if (rect.bottom + panelHeight > viewportH && rect.top > panelHeight) {
      top = rect.top - panelHeight - 6;
    }
    let left = rect.right - panelWidth;
    if (left < 8) left = 8;

    this.panel.style.setProperty("top", `${top}px`, "important");
    this.panel.style.setProperty("left", `${left}px`, "important");
  }

  private renderPanel() {
    if (!this.panel) return;
    const visible = this.visibleIssues();
    this.panel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "wr-panel-header";
    const title = document.createElement("span");
    title.textContent = UI_HE.panelTitle(visible.length);
    header.appendChild(title);
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    closeBtn.addEventListener("click", () => this.closePanel());
    header.appendChild(closeBtn);
    this.panel.appendChild(header);

    const body = document.createElement("div");
    body.className = "wr-panel-body";

    if (this.state === "loading") {
      const empty = document.createElement("div");
      empty.className = "wr-empty";
      empty.textContent = UI_HE.analyzing;
      body.appendChild(empty);
    } else if (this.state === "error") {
      const empty = document.createElement("div");
      empty.className = "wr-empty";
      empty.textContent = UI_HE.error;
      body.appendChild(empty);
    } else if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "wr-empty";
      empty.textContent = UI_HE.noIssues;
      body.appendChild(empty);
    } else {
      for (const issue of visible) {
        body.appendChild(this.renderIssue(issue));
      }
    }

    this.panel.appendChild(body);
    this.positionPanel();
  }

  private renderIssue(issue: Issue): HTMLElement {
    const root = document.createElement("div");
    root.className = "wr-issue";

    const localized = localizeIssue(issue.ruleId);

    const head = document.createElement("div");
    head.className = "wr-issue-header";
    const dot = document.createElement("span");
    dot.className = "wr-issue-dot";
    dot.dataset.cat = issue.category;
    head.appendChild(dot);
    const label = document.createElement("span");
    label.className = "wr-issue-label";
    label.textContent = localized.label;
    head.appendChild(label);
    root.appendChild(head);

    if (localized.explanation) {
      const msg = document.createElement("div");
      msg.className = "wr-issue-message";
      msg.textContent = localized.explanation;
      root.appendChild(msg);
    }

    if (issue.context) {
      const ctx = document.createElement("div");
      ctx.className = "wr-issue-context";
      ctx.dir = "ltr";
      ctx.textContent = issue.context;
      root.appendChild(ctx);
    }

    const actions = document.createElement("div");
    actions.className = "wr-issue-actions";
    actions.dir = "ltr";
    for (const s of issue.suggestions.slice(0, 4)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wr-issue-action";
      btn.dataset.kind = "apply";
      btn.textContent = s.value;
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.target) {
          replaceRange(
            this.target,
            issue.offset,
            issue.offset + issue.length,
            s.value,
          );
        }
        this.cb.onApply(issue, s.value);
      });
      actions.appendChild(btn);
    }
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "wr-issue-action";
    dismiss.dataset.kind = "dismiss";
    dismiss.textContent = UI_HE.dismiss;
    dismiss.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    dismiss.addEventListener("click", (e) => {
      e.preventDefault();
      this.dismissed.add(issue.id);
      this.cb.onDismiss(issue);
      this.setIssues(this.issues);
    });
    actions.appendChild(dismiss);
    root.appendChild(actions);

    return root;
  }
}
