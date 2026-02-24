import { createSignal, onCleanup } from "solid-js";

/**
 * IME composition handling hook.
 *
 * @remarks
 * Delays onValueChange during IME composition (e.g., Korean) to prevent DOM recreation (composition breakage).
 * - During composition: only updates composingValue (for content div display)
 * - On compositionEnd: delays setValue call via setTimeout(0)
 * - Cleanup: immediately commits uncommitted value via flushComposition
 *
 * @param setValue - Value commit function
 * @returns IME handler object
 */
export function createIMEHandler(setValue: (value: string) => void) {
  const [composingValue, setComposingValue] = createSignal<string | null>(null);
  let compositionFlushTimer: ReturnType<typeof setTimeout> | undefined;

  function flushComposition(): void {
    if (compositionFlushTimer != null) {
      clearTimeout(compositionFlushTimer);
      compositionFlushTimer = undefined;
    }
    const pending = composingValue();
    if (pending != null) {
      setComposingValue(null);
      setValue(pending);
    }
  }

  function handleCompositionStart(): void {
    if (compositionFlushTimer != null) {
      clearTimeout(compositionFlushTimer);
      compositionFlushTimer = undefined;
    }
  }

  function handleInput(value: string, isComposing: boolean): void {
    if (isComposing || compositionFlushTimer != null) {
      setComposingValue(value);
      return;
    }
    setComposingValue(null);
    setValue(value);
  }

  function handleCompositionEnd(value: string): void {
    setComposingValue(value);
    compositionFlushTimer = setTimeout(() => {
      compositionFlushTimer = undefined;
      setComposingValue(null);
      setValue(value);
    }, 0);
  }

  onCleanup(() => flushComposition());

  return {
    composingValue,
    handleCompositionStart,
    handleInput,
    handleCompositionEnd,
    flushComposition,
  };
}
