import { NgZone } from "@angular/core";

export async function waitRepaint(ngZone: NgZone) {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      ngZone.run(() => {
        resolve();
      });
    });
  });
}
