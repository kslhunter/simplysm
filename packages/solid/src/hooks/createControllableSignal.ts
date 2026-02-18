import { createSignal, createEffect } from "solid-js";

/**
 * 함수 타입을 제한하는 유틸리티 타입
 * 함수 타입이 전달되면 never로 변환되어 컴파일 타임 에러 발생
 *
 * @remarks
 * 함수를 저장해야 할 경우 객체로 감싸기: `createControllableSignal<{ fn: () => void }>(...)`
 */
type NotFunction<TValue> = TValue extends (...args: unknown[]) => unknown ? never : TValue;

/**
 * Controlled/Uncontrolled 패턴을 지원하는 signal hook
 *
 * @remarks
 * - `onChange`가 제공되면 controlled 모드: 외부에서 값 관리
 * - `onChange`가 없으면 uncontrolled 모드: 내부 상태 사용
 * - 함수형 setter 지원: `setValue(prev => !prev)`
 *
 * @example
 * ```tsx
 * // Controlled 모드 (onOpenChange 제공)
 * const [open, setOpen] = createControllableSignal({
 *   value: () => props.open ?? false,
 *   onChange: () => props.onOpenChange,
 * });
 *
 * // Uncontrolled 모드 (onOpenChange 미제공)
 * const [open, setOpen] = createControllableSignal({
 *   value: () => props.open ?? false,
 *   onChange: () => undefined,
 * });
 *
 * // 함수형 setter
 * setOpen(prev => !prev);
 * ```
 */
export function createControllableSignal<TValue>(options: {
  value: () => TValue & NotFunction<TValue>;
  onChange: () => ((value: TValue) => void) | undefined;
}) {
  const [internalValue, setInternalValue] = createSignal<TValue>(options.value());

  // props 변경 시 내부 상태 동기화 (props 우선)
  createEffect(() => {
    const propValue = options.value();
    setInternalValue(() => propValue);
  });

  const isControlled = () => options.onChange() !== undefined;
  const value = () => (isControlled() ? options.value() : internalValue());
  const setValue = (newValue: TValue | ((prev: TValue) => TValue)) => {
    const resolved =
      typeof newValue === "function" ? (newValue as (prev: TValue) => TValue)(value()) : newValue;

    if (isControlled()) {
      options.onChange()?.(resolved);
    } else {
      setInternalValue(() => resolved);
    }
  };

  return [value, setValue] as const;
}
