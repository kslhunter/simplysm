import {inject, Injector, NgZone} from "@angular/core";


export function runOutsideLast(key: string, fn: () => void) {
  const ngZone = inject(NgZone);
  const injector = inject(Injector);

  if (injector["__outside-req-num-record__"] == null) {
    injector["__outside-req-num-record__"] = {};
  }
  const reqNumRecord: Record<string, number | undefined> = injector["__outside-req-num-record__"];

  ngZone.runOutsideAngular(() => {
    if (reqNumRecord[key] != null) {
      cancelAnimationFrame(reqNumRecord[key]);
    }
    reqNumRecord[key] = requestAnimationFrame(() => {
      fn();
    });
  });
}