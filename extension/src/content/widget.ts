import type { Issue } from "@writeright/shared";
import { replaceRange, type EditableElement } from "./editable";
import { localizeIssue, UI_HE } from "./i18n";

export type WidgetState = "loading" | "clean" | "issues" | "error" | "off";

interface WidgetCallbacks {
  onApply(issue: Issue, replacement: string): void;
  onDismiss(issue: Issue): void;
}

export class Widget {
  private host: HTMLDivElement;
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
    this.host = document.createElement("div");
    this.host.className = "wr-host";
    this.host.setAttribute("data-wr", "true");

    this.button = document.createElement("button");
    this.button.className = "wr-button";
    this.button.type = "button";
    this.button.dataset.state = "loading";
    this.button.innerHTML =
      '<span class="wr-mark">WR</span><span class="wr-count" hidden></span>';
    this.button.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    this.button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.togglePanel();
    });
    this.host.appendChild(this.button);

    document.documentElement.appendChild(this.host);
    this.host.style.display = "none";

    window.addEventListener("scroll", this.scheduleReposition, true);
    window.addEventListener("resize", this.scheduleReposition);
  }

  attach(target: EditableElement) {
    if (this.target === target) return;
    this.target = target;
    this.host.style.display = "";
    this.reposition();
  }

  detach() {
    this.target = null;
    this.host.style.display = "none";
    this.closePanel();
  }

  setState(state: WidgetState) {
    this.state = state;
    this.button.dataset.state = state;
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
    this.host.remove();
  }

  private visibleIssues(): Issue[] {
    return this.issues.filter((i) => !this.dismissed.has(i.id));
  }

  private updateCount() {
    const count = this.visibleIssues().length;
    const span = this.button.querySelector(".wr-count") as HTMLSpanElement;
    if (count > 0 && this.state === "issues") {
      span.textContent = String(count);
      span.hidden = false;
    } else {
      span.hidden = true;
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
      this.host.style.display = "none";
      return;
    }
    const top = rect.bottom - 28;
    const left = rect.right - 36;
    this.button.style.top = `${top}px`;
    this.button.style.left = `${left}px`;
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
      this.panel.className = "wr-panel";
      this.panel.dir = "rtl";
      this.panel.lang = "he";
      this.panel.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      this.host.appendChild(this.panel);
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

    this.panel.style.top = `${top}px`;
    this.panel.style.left = `${left}px`;
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
