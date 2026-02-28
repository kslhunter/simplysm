/**
 * Dialog z-index registry
 *
 * Manages z-index of open Dialogs to prevent infinite increase.
 * Base starting value is 2000 (same as tailwind z-modal), uses only as many as there are open Dialogs.
 */

const BASE_Z = 2000;

// List of open Dialog wrapper elements (order = z-index order)
const stack: HTMLElement[] = [];

/** Register Dialog — add to top of stack and assign z-index */
export function registerDialog(el: HTMLElement): void {
  const idx = stack.indexOf(el);
  if (idx >= 0) return; // Already registered
  stack.push(el);
  el.style.zIndex = (BASE_Z + stack.length - 1).toString();
}

/** Unregister Dialog — remove from stack and reorder rest */
export function unregisterDialog(el: HTMLElement): void {
  const idx = stack.indexOf(el);
  if (idx < 0) return;
  stack.splice(idx, 1);
  reindex();
}

/** Bring Dialog to front (on focus) */
export function bringToFront(el: HTMLElement): void {
  const idx = stack.indexOf(el);
  if (idx < 0 || idx === stack.length - 1) return; // Already at front
  stack.splice(idx, 1);
  stack.push(el);
  reindex();
}

/** Reassign z-index in stack order */
function reindex(): void {
  for (let i = 0; i < stack.length; i++) {
    stack[i].style.zIndex = (BASE_Z + i).toString();
  }
}

/** Check if Dialog is at top of stack */
export function isTopmost(el: HTMLElement): boolean {
  return stack.length > 0 && stack[stack.length - 1] === el;
}

/** Get the topmost (front-most) Dialog element, or null if none are open */
export function getTopmostDialog(): HTMLElement | null {
  return stack.length > 0 ? stack[stack.length - 1] : null;
}
