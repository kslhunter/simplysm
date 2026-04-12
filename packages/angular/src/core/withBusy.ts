import type { WritableSignal } from "@angular/core";

export async function withBusy(
  busyCount: WritableSignal<number>,
  fn: () => Promise<void>,
): Promise<void> {
  busyCount.update((v) => v + 1);
  try {
    await fn();
  } finally {
    busyCount.update((v) => v - 1);
  }
}
