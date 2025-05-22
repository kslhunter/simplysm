import { effect, InputSignal, InputSignalWithTransform, OutputEmitterRef, signal, WritableSignal } from "@angular/core";
import { SIGNAL } from "@angular/core/primitives/signals";

/**
 * set() 시, output.emit()이 있으면 emit
 * emit이 없으면 내부 상태만 갱신
 */
export function $model<T>(
  input: InputSignalWithTransform<T, any>,
  output: OutputEmitterRef<T>,
): InputSignal<T> & WritableSignal<T> {
  const sig = signal<T>(input[SIGNAL]["value"]) as InputSignal<T> & WritableSignal<T>;

  const orgSet = sig.set;
  effect(() => {
    orgSet(input());
  });

  sig.set = (v: T) => {
    changed(v);
  };

  sig.update = (fn: (v: T) => T) => {
    const v = fn(sig[SIGNAL]["value"]);
    changed(v);
  };

  function changed(v: T) {
    if (output["listeners"] != null && output["listeners"].length > 0) {
      output.emit(v);
    } else {
      orgSet(v);
    }
  }

  return sig;
}