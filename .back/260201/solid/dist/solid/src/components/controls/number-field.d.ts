import { type Component, type JSX } from "solid-js";
import { type NumberFieldStyles } from "./number-field.css";
import "@simplysm/core-common";
/**
 * NumberField 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property useNumberComma - true일 경우 천단위 콤마 표시
 * @property minDigits - 최소 자릿수 (부족하면 앞에 0 채움)
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property inline - true일 경우 inline-block으로 표시
 */
export interface NumberFieldProps
  extends
    Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size">,
    NumberFieldStyles {
  value?: number | undefined;
  onChange?: (value: number | undefined) => void;
  useNumberComma?: boolean;
  minDigits?: number;
}
/**
 * 숫자 입력 필드 컴포넌트
 *
 * @example
 * ```tsx
 * const [num, setNum] = createSignal<number | undefined>(1234);
 * <NumberField value={num()} onChange={setNum} />
 * <NumberField value={num()} onChange={setNum} useNumberComma />
 * <NumberField value={num()} onChange={setNum} minDigits={3} />
 * ```
 */
export declare const NumberField: Component<NumberFieldProps>;
//# sourceMappingURL=number-field.d.ts.map
