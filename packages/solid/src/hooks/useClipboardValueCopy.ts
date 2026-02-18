import { onCleanup, onMount } from "solid-js";

/**
 * 폼 컨트롤의 value를 클립보드 복사에 포함시키는 초기화 훅
 *
 * @remarks
 * 브라우저 기본 동작에서는 드래그 선택 후 복사 시 `<input>`, `<textarea>`, `<select>`의
 * 값이 포함되지 않는 문제를 해결한다.
 *
 * - `<input type="text|number|...">` → `.value`
 * - `<textarea>` → `.value`
 * - `<select>` → 선택된 옵션 텍스트
 * - `<input type="checkbox|radio">` → `.checked` ? "Y" : ""
 * - 테이블 내에서는 셀 간 탭(`\t`), 행 간 개행(`\n`) 구분 (Excel 호환)
 */
export function useClipboardValueCopy(): void {
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
}

/**
 * Selection Range 내의 텍스트를 추출한다.
 * 폼 컨트롤은 value로 치환하고, 테이블 구조는 TSV 형식으로 변환한다.
 *
 * @returns 추출된 텍스트. 폼 컨트롤이 없으면 `null` (브라우저 기본 동작 유지)
 */
function extractTextFromRange(range: Range): string | null {
  const root =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!root) return null;

  // 선택 범위에 폼 컨트롤이 없으면 브라우저 기본 동작 사용
  const formSelector =
    'input:not([type=hidden]), textarea, select, [role="checkbox"], [role="radio"]';
  const hasFormElements = [...root.querySelectorAll(formSelector)].some((el) =>
    range.intersectsNode(el),
  );
  if (!hasFormElements) return null;

  const parts: string[] = [];

  const walk = (node: Node) => {
    if (!range.intersectsNode(node)) return;

    // ARIA checkbox/radio: role="checkbox" 또는 role="radio" 요소
    if (node instanceof Element) {
      const role = node.getAttribute("role");
      if (role === "checkbox" || role === "radio") {
        parts.push(node.getAttribute("aria-checked") === "true" ? "Y" : "");
        return;
      }
    }

    // 폼 컨트롤: value 추출
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
      // 개행 포함 시 큰따옴표로 감싸서 Excel 셀 내 줄바꿈 유지
      parts.push(v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v);
      return;
    }
    if (node instanceof HTMLSelectElement) {
      if (node.selectedOptions.length > 0) {
        parts.push(node.selectedOptions[0].textContent.trim());
      }
      return;
    }

    // 텍스트 노드
    if (node.nodeType === Node.TEXT_NODE) {
      // 숨겨진 텍스트 건너뛰기 (dual-element overlay 패턴 등)
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

    // Element가 아닌 노드
    if (!(node instanceof Element)) {
      for (const child of node.childNodes) walk(child);
      return;
    }

    // <br>
    if (node.tagName === "BR") {
      parts.push("\n");
      return;
    }

    // 테이블 행: 셀 간 탭 구분, 행 끝 개행
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

    // 기본: 자식 순회
    for (const child of node.childNodes) {
      walk(child);
    }
  };

  walk(range.commonAncestorContainer);

  return parts.join("").replace(/\n+$/, "");
}

/**
 * input value를 로캘 형식으로 변환한다.
 * - `date` → `toLocaleDateString()`
 * - `time` → `toLocaleTimeString()`
 * - `datetime-local` → `toLocaleString()`
 * - 그 외 → 원래 값 그대로
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
