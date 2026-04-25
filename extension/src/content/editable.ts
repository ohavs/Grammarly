export type EditableElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | (HTMLElement & { isContentEditable: true });

const SUPPORTED_INPUT_TYPES = new Set([
  "text",
  "search",
  "url",
  "email",
  "tel",
  "",
]);

export function isEditable(target: EventTarget | null): target is EditableElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    return SUPPORTED_INPUT_TYPES.has(target.type);
  }
  if (target.isContentEditable) {
    if (target.getAttribute("aria-readonly") === "true") return false;
    return true;
  }
  return false;
}

export function getText(el: EditableElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  return el.innerText;
}

export function replaceRange(
  el: EditableElement,
  start: number,
  end: number,
  replacement: string,
): void {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const next = before + replacement + after;
    el.focus();
    el.setSelectionRange(start, end);
    if (
      typeof (el as any).setRangeText === "function" &&
      document.execCommand
    ) {
      try {
        document.execCommand("insertText", false, replacement);
        return;
      } catch {
        // fall through
      }
    }
    el.value = next;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.setSelectionRange(start + replacement.length, start + replacement.length);
    return;
  }

  const range = findRangeFromTextOffsets(el, start, end);
  if (!range) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
  if (document.execCommand) {
    try {
      document.execCommand("insertText", false, replacement);
      return;
    } catch {
      // fall through
    }
  }
  range.deleteContents();
  range.insertNode(document.createTextNode(replacement));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function findRangeFromTextOffsets(
  root: HTMLElement,
  start: number,
  end: number,
): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    if (!startNode && pos + len >= start) {
      startNode = node;
      startOffset = start - pos;
    }
    if (pos + len >= end) {
      endNode = node;
      endOffset = end - pos;
      break;
    }
    pos += len;
    node = walker.nextNode() as Text | null;
  }

  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}
