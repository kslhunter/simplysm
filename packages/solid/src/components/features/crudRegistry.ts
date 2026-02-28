/**
 * Crud activation registry
 *
 * Tracks mounted CrudDetail/CrudSheet instances and determines which one
 * should respond to keyboard shortcuts (Ctrl+S, Ctrl+Alt+L).
 *
 * Priority rules:
 * 1. If a Dialog is open, only cruds inside the topmost Dialog are candidates.
 * 2. Among candidates, the most recently activated (interacted) crud wins.
 * 3. On mount, cruds are auto-activated (last mounted = active).
 */

import { getTopmostDialog } from "../disclosure/dialogZIndex";

interface CrudEntry {
  id: string;
  formEl: HTMLFormElement;
  lastActivatedAt: number;
}

const entries: CrudEntry[] = [];
let _counter = 0;

export function registerCrud(id: string, formEl: HTMLFormElement): void {
  const existing = entries.find((e) => e.id === id);
  if (existing) return;
  entries.push({ id, formEl, lastActivatedAt: ++_counter });
}

export function unregisterCrud(id: string): void {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx >= 0) entries.splice(idx, 1);
}

export function activateCrud(id: string): void {
  const entry = entries.find((e) => e.id === id);
  if (entry) entry.lastActivatedAt = ++_counter;
}

export function isActiveCrud(id: string): boolean {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return false;

  const topDialog = getTopmostDialog();

  const candidates = topDialog
    ? entries.filter((e) => topDialog.contains(e.formEl))
    : entries;

  if (candidates.length === 0) return false;

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].lastActivatedAt > best.lastActivatedAt) {
      best = candidates[i];
    }
  }

  return best.id === id;
}
