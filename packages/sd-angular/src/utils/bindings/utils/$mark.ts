import { WritableSignal } from "@angular/core";
import { producerUpdatesAllowed } from "@angular/core/primitives/signals";
import { ObjectUtils } from "@simplysm/sd-core-common";

export function $mark(sig: WritableSignal<any>) {
  if (!producerUpdatesAllowed()) {
    throw new Error();
  }

  sig.update((v) => ObjectUtils.clone(v, { onlyOneDepth: true }));

  /*const node = sig[SIGNAL] as any;
  node.version++;
  producerIncrementEpoch();
  producerNotifyConsumers(node);
  runPostSignalSetFn(node);*/
}
