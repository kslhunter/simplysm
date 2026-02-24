import { onCleanup, onMount, type ParentComponent } from "solid-js";

/**
 * Provider that includes form control values in clipboard copy.
 *
 * @remarks
 * Fixes the browser default behavior where `<input>`, `<textarea>`, `<select>` values
 * are not included when copying after drag selection.
 *
 * - `<input type="text|number|...">` → `.value`
 * - `<textarea>` → `.value`
 * - `<select>` → selected option text
 * - `<input type="checkbox|radio">` → `.checked` ? "Y" : ""
 * - Within tables: tab (`\t`) between cells, newline (`\n`) between rows (Excel compatible)
 */
export const ClipboardProvider: ParentComponent = (props) => {
  onMount(() => {
    const handler = (e: ClipboardEvent) => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      const text = extractTextFromRange(range);
      if (text == null) return;

      e.clipboardData!.setData("text/plain", text);
      e.preventDefault();
    };

    document.addEventListener("copy", handler);
    onCleanup(() => document.removeEventListener("copy", handler));
  });

  return <>{props.children}</>;
};

/**
 * Extracts text from a Selection Range.
 * Substitutes form controls with their values and converts table structures to TSV format.
 *
 * @returns Extracted text. Returns `null` if no form controls are present (preserves browser default behavior)
 */
function extractTextFromRange(range: Range): string | null {
  const root =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!root) return null;

  // Use browser default behavior if no form controls in selection range
  const formSelector =
    'input:not([type=hidden]), textarea, select, [role="checkbox"], [role="radio"]';
  const hasFormElements = [...root.querySelectorAll(formSelector)].some((el) =>
    range.intersectsNode(el),
  );
  if (!hasFormElements) return null;

  const parts: string[] = [];

  const walk = (node: Node) => {
    if (!range.intersectsNode(node)) return;

    // ARIA checkbox/radio: elements with role="checkbox" or role="radio"
    if (node instanceof Element) {
      const role = node.getAttribute("role");
      if (role === "checkbox" || role === "radio") {
        parts.push(node.getAttribute("aria-checked") === "true" ? "Y" : "");
        return;
      }
    }

    // Form control: extract value
    if (node instanceof HTMLInputElement) {
      if (node.type === "hidden") return;
      if (node.type === "checkbox" || node.type === "radio") {
        parts.push(node.checked ? "Y" : "");
      } else {
        parts.push(formatInputValue(node));
      }
      return;
    }
    if (node instanceof HTMLTextAreaElement) {
      const v = node.value;
      // Wrap in double quotes when containing newlines to preserve line breaks within Excel cells
      parts.push(v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v);
      return;
    }
    if (node instanceof HTMLSelectElement) {
      if (node.selectedOptions.length > 0) {
        parts.push(node.selectedOptions[0].textContent.trim());
      }
      return;
    }

    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
      // Skip hidden text (dual-element overlay pattern, etc.)
      const parent = node.parentElement;
      if (parent) {
        const style = getComputedStyle(parent);
        if (style.visibility === "hidden" || style.display === "none") {
          return;
        }
      }

      let text = node.textContent ?? "";
      if (node === range.startContainer && node === range.endContainer) {
        text = text.slice(range.startOffset, range.endOffset);
      } else if (node === range.startContainer) {
        text = text.slice(range.startOffset);
      } else if (node === range.endContainer) {
        text = text.slice(0, range.endOffset);
      }
      parts.push(text);
      return;
    }

    // Non-Element node
    if (!(node instanceof Element)) {
      for (const child of node.childNodes) walk(child);
      return;
    }

    // <br>
    if (node.tagName === "BR") {
      parts.push("\n");
      return;
    }

    // Table row: tab-separated cells, newline at end of row
    if (node.tagName === "TR") {
      let firstCell = true;
      for (const child of node.childNodes) {
        if (!range.intersectsNode(child)) continue;
        if (child instanceof HTMLTableCellElement) {
          if (!firstCell) parts.push("\t");
          firstCell = false;
        }
        walk(child);
      }
      parts.push("\n");
      return;
    }

    // Default: traverse children
    for (const child of node.childNodes) {
      walk(child);
    }
  };

  walk(range.commonAncestorContainer);

  return parts.join("").replace(/\n+$/, "");
}

/**
 * Converts input value to locale format.
 * - `date` → `toLocaleDateString()`
 * - `time` → `toLocaleTimeString()`
 * - `datetime-local` → `toLocaleString()`
 * - Others → original value as-is
 */
function formatInputValue(input: HTMLInputElement): string {
  const { type, value } = input;
  if (!value) return "";

  if (type === "date" || type === "datetime-local") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return type === "date" ? date.toLocaleDateString() : date.toLocaleString();
    }
  }

  if (type === "time") {
    const date = new Date(`1970-01-01T${value}`);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString();
    }
  }

  return value;
}
