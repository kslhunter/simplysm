import { WritableSignal } from "@angular/core";
import {
  producerIncrementEpoch,
  producerNotifyConsumers,
  producerUpdatesAllowed,
  runPostSignalSetFn,
  SIGNAL,
} from "@angular/core/primitives/signals";
import { ObjectUtils } from "@simplysm/sd-core-common";

export function $mark(sig: WritableSignal<any>, clone?: boolean) {
  if (!producerUpdatesAllowed()) {
    throw new Error();
  }

  if (clone) {
    sig.update((v) => ObjectUtils.clone(v, { onlyOneDepth: true }));
  } else {
    const node = sig[SIGNAL] as any;
    node.version++;
    producerIncrementEpoch();
    producerNotifyConsumers(node);
    runPostSignalSetFn(node);
  }
}
