import { createSignal, onCleanup } from "solid-js";

/**
 * IME 조합 처리 훅
 *
 * @remarks
 * 한글 등 IME 조합 중 onValueChange를 지연하여 DOM 재생성(조합 끊김)을 방지합니다.
 * - 조합 중: composingValue만 업데이트 (content div 표시용)
 * - 조합 완료(compositionEnd): setTimeout(0)으로 지연 후 setValue 호출
 * - cleanup: flushComposition으로 미커밋 값 즉시 커밋
 *
 * @param setValue - 값 커밋 함수
 * @returns IME 핸들러 객체
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
