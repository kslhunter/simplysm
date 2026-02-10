/**
 * createFieldState 옵션
 * @typeParam T - 필드 값의 타입
 */
export interface FieldStateOptions<T> {
  /**
   * 외부에서 전달받은 value (getter로 접근하여 반응성 유지)
   */
  value: () => T | undefined;
  /**
   * onChange 콜백 (있으면 controlled, 없으면 uncontrolled)
   */
  onChange: () => ((value: T | undefined) => void) | undefined;
}
/**
 * createFieldState 반환값
 * @typeParam T - 필드 값의 타입
 */
export interface FieldState<T> {
  /**
   * 현재 값 (controlled면 외부 value, uncontrolled면 내부 상태)
   */
  currentValue: () => T | undefined;
  /**
   * 값 설정 (controlled면 onChange 호출, uncontrolled면 내부 상태 변경)
   */
  setValue: (value: T | undefined) => void;
  /**
   * controlled 모드 여부
   */
  isControlled: () => boolean;
}
/**
 * Field 컴포넌트의 controlled/uncontrolled 상태를 관리하는 훅
 *
 * **controlled 모드** (onChange가 있을 때):
 * - currentValue()는 외부에서 전달받은 value를 반환
 * - setValue()는 onChange를 호출
 *
 * **uncontrolled 모드** (onChange가 없을 때):
 * - currentValue()는 내부 상태를 반환 (초기값은 최초 호출 시점의 value)
 * - setValue()는 내부 상태를 변경
 * - 주의: uncontrolled 모드에서는 외부 value prop 변경이 반영되지 않음
 *
 * **설계 결정**:
 * - options.value()와 options.onChange()는 getter 함수로 전달되어
 *   SolidJS의 fine-grained reactivity를 유지함
 * - 매 접근 시 getter가 호출되므로 props 변경이 즉시 반영됨
 *
 * @typeParam T - 필드 값의 타입
 * @param options - 필드 상태 옵션
 * @returns 필드 상태 객체
 *
 * @example
 * ```tsx
 * // SolidJS 컴포넌트 내부에서 splitProps 후 사용
 * const [local, rest] = splitProps(props, ["value", "onChange"]);
 *
 * const fieldState = createFieldState({
 *   value: () => local.value,      // getter로 전달하여 반응성 유지
 *   onChange: () => local.onChange, // getter로 전달
 * });
 *
 * // 현재 값 읽기
 * const value = fieldState.currentValue();
 *
 * // 값 변경 (controlled면 onChange 호출, uncontrolled면 내부 상태 변경)
 * fieldState.setValue(newValue);
 * ```
 */
export declare function createFieldState<T>(options: FieldStateOptions<T>): FieldState<T>;
//# sourceMappingURL=createFieldState.d.ts.map
