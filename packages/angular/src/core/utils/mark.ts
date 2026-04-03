import type { WritableSignal } from "@angular/core";
import {
  producerIncrementEpoch,
  producerNotifyConsumers,
  producerUpdatesAllowed,
  runPostSignalSetFn,
  SIGNAL,
} from "@angular/core/primitives/signals";

export function mark(sig: WritableSignal<any>, clone?: boolean): void {
  if (clone) {
    sig.update((v) => (Array.isArray(v) ? [...v] : { ...v }));
  } else {
    if (!producerUpdatesAllowed()) {
      throw new Error();
    }

    const node = sig[SIGNAL] as any;
    node.version++;
    producerIncrementEpoch();
    producerNotifyConsumers(node);
    runPostSignalSetFn(node);
  }
}
