import type { Issue } from "@writeright/shared";
import { replaceRange, replaceAll, type EditableElement } from "./editable";
import { localizeIssue, UI_HE } from "./i18n";

export type WidgetState = "loading" | "clean" | "issues" | "error" | "off";

interface WidgetCallbacks {
  onApply(issue: Issue, replacement: string): void;
  onDismiss(issue: Issue): void;
  onSnooze(): void;
}

const STATE_COLORS: Record<WidgetState, string> = {
  loading: "#64748b",
  clean: "#16a34a",
  issues: "#ef4444",
  error: "#dc2626",
  off: "#94a3b8",
};

const DRAG_THRESHOLD = 5;
const DROP_ZONE_RADIUS = 40;

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
  set("cursor", "grab");
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
  set("transition", "box-shadow 0.15s");
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

function applyDropZoneStyles(zone: HTMLDivElement) {
  const set = (k: string, v: string) => zone.style.setProperty(k, v, "important");
  set("position", "fixed");
  set("bottom", "40px");
  set("left", "50%");
  set("transform", "translateX(-50%) scale(1)");
  set("width", "64px");
  set("height", "64px");
  set("border-radius", "50%");
  set("background", "rgba(239,68,68,0.9)");
  set("color", "#ffffff");
  set("display", "flex");
  set("align-items", "center");
  set("justify-content", "center");
  set("font-size", "26px");
  set("font-weight", "700");
  set("font-family", "system-ui,-apple-system,sans-serif");
  set("z-index", "2147483647");
  set("box-shadow", "0 4px 24px rgba(239,68,68,0.45)");
  set("transition", "transform 0.12s, box-shadow 0.12s");
  set("pointer-events", "none");
  set("user-select", "none");
  set("cursor", "default");
  set("margin", "0");
  set("padding", "0");
  set("border", "3px solid rgba(255,255,255,0.35)");
  set("box-sizing", "border-box");
}

export class Widget {
  private button: HTMLButtonElement;
  private panel: HTMLDivElement | null = null;
  private dropZone: HTMLDivElement | null = null;
  private state: WidgetState = "loading";
  private issues: Issue[] = [];
  private dismissed = new Set<string>();
  private target: EditableElement | null = null;
  private cb: WidgetCallbacks;
  private isPanelOpen = false;
  private repositionRaf = 0;

  // Drag state
  private dragStartX = 0;
  private dragStartY = 0;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private isDragging = false;
  private dragMoved = false;

  // Pinned position after user drags
  private pinnedX: number | null = null;
  private pinnedY: number | null = null;

  constructor(cb: WidgetCallbacks) {
    this.cb = cb;

    this.button = document.createElement("button");
    this.button.setAttribute("data-wr", "true");
    this.button.type = "button";
    this.button.dataset.state = "loading";
    this.button.innerHTML =
      '<span style="font-weight:800">WR</span><span data-wr-count style="margin-left:4px;font-weight:700" hidden></span>';

    applyButtonStyles(this.button);

    this.button.addEventListener("mousedown", this.onButtonMouseDown);
    this.button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.dragMoved) {
        this.dragMoved = false;
        return;
      }
      this.togglePanel();
    });

    document.documentElement.appendChild(this.button);
    console.log("[wr] widget button appended", this.button);

    window.addEventListener("scroll", this.scheduleReposition, true);
    window.addEventListener("resize", this.scheduleReposition);
  }

  // ── Drag handling ──────────────────────────────────────────────────────────

  private onButtonMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const btnRect = this.button.getBoundingClientRect();
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragOffsetX = e.clientX - btnRect.left;
    this.dragOffsetY = e.clientY - btnRect.top;
    this.isDragging = false;
    this.dragMoved = false;

    document.addEventListener("mousemove", this.onDragMove, true);
    document.addEventListener("mouseup", this.onDragEnd, true);
  };

  private onDragMove = (e: MouseEvent) => {
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    if (!this.isDragging) {
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      this.isDragging = true;
      this.dragMoved = true;
      this.closePanel();
      this.button.style.setProperty("cursor", "grabbing", "important");
      this.button.style.setProperty("box-shadow", "0 6px 20px rgba(0,0,0,.35)", "important");
      this.showDropZone();
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const btnW = this.button.offsetWidth;
    const btnH = this.button.offsetHeight;
    const newLeft = Math.max(0, Math.min(vw - btnW, e.clientX - this.dragOffsetX));
    const newTop = Math.max(0, Math.min(vh - btnH, e.clientY - this.dragOffsetY));

    this.button.style.setProperty("left", `${newLeft}px`, "important");
    this.button.style.setProperty("top", `${newTop}px`, "important");

    this.updateDropZoneHover(e.clientX, e.clientY);
  };

  private onDragEnd = (e: MouseEvent) => {
    document.removeEventListener("mousemove", this.onDragMove, true);
    document.removeEventListener("mouseup", this.onDragEnd, true);

    if (!this.isDragging) return;
    this.isDragging = false;
    this.button.style.setProperty("cursor", "grab", "important");
    this.button.style.setProperty("box-shadow", "0 2px 8px rgba(0,0,0,.25)", "important");

    if (this.isOverDropZone(e.clientX, e.clientY)) {
      this.hideDropZone();
      this.cb.onSnooze();
      return;
    }

    // Pin button at the position the user dropped it
    const btnRect = this.button.getBoundingClientRect();
    this.pinnedX = btnRect.left;
    this.pinnedY = btnRect.top;

    this.hideDropZone();
  };

  private showDropZone() {
    if (this.dropZone) return;
    this.dropZone = document.createElement("div");
    this.dropZone.setAttribute("data-wr", "true");
    this.dropZone.textContent = "✕";
    applyDropZoneStyles(this.dropZone);
    document.documentElement.appendChild(this.dropZone);
  }

  private hideDropZone() {
    if (this.dropZone) {
      this.dropZone.remove();
      this.dropZone = null;
    }
  }

  private updateDropZoneHover(mouseX: number, mouseY: number) {
    if (!this.dropZone) return;
    if (this.isOverDropZone(mouseX, mouseY)) {
      this.dropZone.style.setProperty("transform", "translateX(-50%) scale(1.3)", "important");
      this.dropZone.style.setProperty("box-shadow", "0 8px 32px rgba(239,68,68,0.65)", "important");
    } else {
      this.dropZone.style.setProperty("transform", "translateX(-50%) scale(1)", "important");
      this.dropZone.style.setProperty("box-shadow", "0 4px 24px rgba(239,68,68,0.45)", "important");
    }
  }

  private isOverDropZone(mouseX: number, mouseY: number): boolean {
    if (!this.dropZone) return false;
    const rect = this.dropZone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.sqrt((mouseX - cx) ** 2 + (mouseY - cy) ** 2);
    return dist < DROP_ZONE_RADIUS;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  attach(target: EditableElement) {
    if (this.target === target) return;
    this.target = target;
    this.button.style.setProperty("display", "inline-flex", "important");
    if (this.pinnedX !== null && this.pinnedY !== null) {
      this.button.style.setProperty("left", `${this.pinnedX}px`, "important");
      this.button.style.setProperty("top", `${this.pinnedY}px`, "important");
    } else {
      this.reposition();
    }
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
    document.removeEventListener("mousemove", this.onDragMove, true);
    document.removeEventListener("mouseup", this.onDragEnd, true);
    this.button.remove();
    if (this.panel) this.panel.remove();
    this.hideDropZone();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

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
    // Don't override a user-pinned position
    if (this.pinnedX !== null) return;
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
    if (!this.panel) return;
    const btnRect = this.button.getBoundingClientRect();
    const panelHeight = this.panel.offsetHeight || 200;
    const panelWidth = this.panel.offsetWidth || 320;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    let top = btnRect.bottom + 6;
    if (btnRect.bottom + panelHeight > viewportH && btnRect.top > panelHeight) {
      top = btnRect.top - panelHeight - 6;
    }
    let left = btnRect.right - panelWidth;
    if (left < 8) left = 8;
    if (left + panelWidth > viewportW - 8) left = viewportW - panelWidth - 8;

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

      const errOff = issue.contextErrorOffset ?? -1;
      const errLen = issue.contextErrorLength ?? issue.length;
      const isFullTextCorrection = errOff === 0 && errLen >= issue.context.length;
      if (errOff >= 0 && errOff < issue.context.length && !isFullTextCorrection) {
        const before = document.createElement("span");
        before.textContent = issue.context.slice(0, errOff);
        const err = document.createElement("span");
        err.className = "wr-ctx-error";
        err.textContent = issue.context.slice(errOff, errOff + errLen);
        const after = document.createElement("span");
        after.textContent = issue.context.slice(errOff + errLen);
        ctx.appendChild(before);
        ctx.appendChild(err);
        ctx.appendChild(after);
      } else {
        ctx.textContent = issue.context;
      }
      root.appendChild(ctx);

      const firstSuggestion = issue.suggestions[0];
      if (firstSuggestion && errOff >= 0) {
        const corrected = document.createElement("div");
        corrected.className = "wr-issue-corrected";
        corrected.dir = "ltr";
        corrected.title = "לחץ להחלפה";
        corrected.textContent =
          issue.context.slice(0, errOff) +
          firstSuggestion.value +
          issue.context.slice(errOff + errLen);
        corrected.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        corrected.addEventListener("click", (e) => {
          e.preventDefault();
          if (this.target) {
            if (issue.ruleId === "gemini-correction") {
              replaceAll(this.target, firstSuggestion.value);
            } else {
              replaceRange(this.target, issue.offset, issue.offset + issue.length, firstSuggestion.value);
            }
          }
          this.cb.onApply(issue, firstSuggestion.value);
        });
        root.appendChild(corrected);
      }
    }

    const actions = document.createElement("div");
    actions.className = "wr-issue-actions";
    actions.dir = "ltr";
    const skipButtons = issue.ruleId === "gemini-correction";
    const buttonSuggestions = skipButtons ? [] : issue.suggestions.slice(0, 4);
    for (const s of buttonSuggestions) {
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
