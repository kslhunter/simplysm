import { type Component, type JSX } from "solid-js";
import { type DateFieldStyles } from "./date-field.css";
import { DateOnly } from "@simplysm/core-common";
import "@simplysm/core-common";
/**
 * DateField 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property type - 입력 타입 (date, month, year)
 * @property min - 선택 가능한 최소 날짜
 * @property max - 선택 가능한 최대 날짜
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property inline - true일 경우 inline-block으로 표시
 */
export interface DateFieldProps
  extends
    Omit<
      JSX.InputHTMLAttributes<HTMLInputElement>,
      "value" | "onChange" | "type" | "min" | "max" | "size"
    >,
    DateFieldStyles {
  value?: DateOnly | undefined;
  onChange?: (value: DateOnly | undefined) => void;
  type?: "date" | "month" | "year";
  min?: DateOnly;
  max?: DateOnly;
}
/**
 * 날짜 입력 필드 컴포넌트
 *
 * @example
 * ```tsx
 * const [date, setDate] = createSignal<DateOnly | undefined>(new DateOnly());
 * <DateField value={date()} onChange={setDate} />
 * <DateField value={date()} onChange={setDate} type="month" />
 * <DateField value={date()} onChange={setDate} min={new DateOnly(2024, 1, 1)} />
 * ```
 */
export declare const DateField: Component<DateFieldProps>;
//# sourceMappingURL=date-field.d.ts.map
