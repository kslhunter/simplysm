import { isFocusable } from "tabbable";
import { TimeoutError } from "@simplysm/core-common";

/**
 * Element bounds information type
 */
export interface ElementBounds {
  /** Element to be measured */
  target: Element;
  /** Top position relative to viewport */
  top: number;
  /** Left position relative to viewport */
  left: number;
  /** Element width */
  width: number;
  /** Element height */
  height: number;
}

declare global {
  interface Element {
    /**
     * Find all child elements matching selector
     *
     * @param selector - CSS selector
     * @returns Array of matching elements (empty selector returns empty array)
     */
    findAll<T extends Element = Element>(selector: string): T[];

    /**
     * Find first element matching selector
     *
     * @param selector - CSS selector
     * @returns First matching element or undefined (empty selector returns undefined)
     */
    findFirst<T extends Element = Element>(selector: string): T | undefined;

    /**
     * Insert element as first child
     *
     * @param child - Child element to insert
     * @returns Inserted child element
     */
    prependChild<T extends Element>(child: T): T;

    /**
     * Get all parent elements (in order of proximity)
     *
     * @returns Array of parent elements (from closest to farthest)
     */
    getParents(): Element[];

    /**
     * Find first focusable parent element (using tabbable)
     *
     * @returns First focusable parent element or undefined
     */
    findFocusableParent(): HTMLElement | undefined;

    /**
     * Find first focusable child element (using tabbable)
     *
     * @returns First focusable child element or undefined
     */
    findFirstFocusableChild(): HTMLElement | undefined;

    /**
     * Check if element is an offset parent (position: relative/absolute/fixed/sticky)
     *
     * @returns true if position property is one of relative, absolute, fixed, or sticky
     */
    isOffsetElement(): boolean;

    /**
     * Check if element is visible on screen
     *
     * @remarks
     * Checks existence of clientRects, visibility: hidden, and opacity: 0.
     *
     * @returns true if element is visible on screen
     */
    isVisible(): boolean;
  }
}

Element.prototype.findAll = function <T extends Element = Element>(selector: string): T[] {
  const trimmed = selector.trim();
  if (trimmed === "") return [];
  return Array.from(this.querySelectorAll<T>(trimmed));
};

Element.prototype.findFirst = function <T extends Element = Element>(
  selector: string,
): T | undefined {
  const trimmed = selector.trim();
  if (trimmed === "") return undefined;
  return this.querySelector<T>(trimmed) ?? undefined;
};

Element.prototype.prependChild = function <T extends Element>(child: T): T {
  return this.insertBefore(child, this.firstElementChild);
};

Element.prototype.getParents = function (): Element[] {
  const result: Element[] = [];
  let cursor = this.parentNode;
  while (cursor !== null && cursor instanceof Element) {
    result.push(cursor);
    cursor = cursor.parentNode;
  }
  return result;
};

Element.prototype.findFocusableParent = function (): HTMLElement | undefined {
  let parentEl = this.parentElement;
  while (parentEl !== null) {
    if (isFocusable(parentEl)) {
      return parentEl;
    }
    parentEl = parentEl.parentElement;
  }
  return undefined;
};

Element.prototype.findFirstFocusableChild = function (): HTMLElement | undefined {
  const walker = document.createTreeWalker(this, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node !== null) {
    if (node instanceof HTMLElement && isFocusable(node)) {
      return node;
    }
    node = walker.nextNode();
  }
  return undefined;
};

Element.prototype.isOffsetElement = function (): boolean {
  return ["relative", "absolute", "fixed", "sticky"].includes(getComputedStyle(this).position);
};

Element.prototype.isVisible = function (): boolean {
  const style = getComputedStyle(this);
  return this.getClientRects().length > 0 && style.visibility !== "hidden" && style.opacity !== "0";
};

// ============================================================================
// Static functions (for event handlers or multiple elements)
// ============================================================================

/**
 * Copy element content to clipboard (use with copy event handler)
 *
 * @param event - copy event object
 */
export function copyElement(event: ClipboardEvent): void {
  const clipboardData = event.clipboardData;
  const target = event.target;
  if (clipboardData == null || !(target instanceof Element)) return;

  const firstInputEl = target.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    "input, textarea",
  );
  if (firstInputEl != null) {
    clipboardData.setData("text/plain", firstInputEl.value);
    event.preventDefault();
  }
}

/**
 * Paste clipboard content to element (use with paste event handler)
 *
 * @remarks
 * Finds the first input/textarea within the target element and replaces its entire value with clipboard content.
 * Does not consider cursor position or selection.
 *
 * @param event - paste event object
 */
export function pasteToElement(event: ClipboardEvent): void {
  const clipboardData = event.clipboardData;
  const target = event.target;
  if (clipboardData == null || !(target instanceof Element)) return;

  const contentText = clipboardData.getData("text/plain");

  const firstInputEl = target.findFirst<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  if (firstInputEl !== undefined) {
    firstInputEl.value = contentText;
    firstInputEl.dispatchEvent(new Event("input", { bubbles: true }));
    event.preventDefault();
  }
}

/**
 * Get bounds information for elements using IntersectionObserver
 *
 * @param els - Array of target elements
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @throws {TimeoutError} If no response within timeout duration
 */
export async function getBounds(els: Element[], timeout: number = 5000): Promise<ElementBounds[]> {
  // Index map to remove duplicates and sort results in input order
  const indexMap = new Map(els.map((el, i) => [el, i] as const));
  if (indexMap.size === 0) {
    return [];
  }

  // Index map for sorting performance optimization
  const sortIndexMap = new Map(els.map((el, i) => [el, i] as const));

  let observer: IntersectionObserver | undefined;

  try {
    return await Promise.race([
      new Promise<ElementBounds[]>((resolve) => {
        const results: ElementBounds[] = [];

        observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const target = entry.target;
            if (indexMap.has(target)) {
              indexMap.delete(target);
              results.push({
                target,
                top: entry.boundingClientRect.top,
                left: entry.boundingClientRect.left,
                width: entry.boundingClientRect.width,
                height: entry.boundingClientRect.height,
              });
            }
          }

          if (indexMap.size === 0) {
            observer?.disconnect();
            // Sort in input order
            resolve(
              results.sort((a, b) => sortIndexMap.get(a.target)! - sortIndexMap.get(b.target)!),
            );
          }
        });

        for (const el of indexMap.keys()) {
          observer.observe(el);
        }
      }),
      new Promise<ElementBounds[]>((_, reject) =>
        setTimeout(() => reject(new TimeoutError(undefined, `${timeout}ms timeout`)), timeout),
      ),
    ]);
  } finally {
    observer?.disconnect();
  }
}
