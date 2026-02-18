import { type Component, type JSX } from "solid-js";
import { type DateTimeFieldStyles } from "./datetime-field.css";
import { DateTime } from "@simplysm/core-common";
import "@simplysm/core-common";
/**
 * DateTimeField 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property type - 입력 타입 (datetime: 날짜+시:분, datetime-sec: 날짜+시:분:초)
 * @property min - 선택 가능한 최소 날짜시간
 * @property max - 선택 가능한 최대 날짜시간
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property inline - true일 경우 inline-block으로 표시
 */
export interface DateTimeFieldProps
  extends
    Omit<
      JSX.InputHTMLAttributes<HTMLInputElement>,
      "value" | "onChange" | "type" | "min" | "max" | "size"
    >,
    DateTimeFieldStyles {
  value?: DateTime | undefined;
  onChange?: (value: DateTime | undefined) => void;
  type?: "datetime" | "datetime-sec";
  min?: DateTime;
  max?: DateTime;
}
/**
 * 날짜시간 입력 필드 컴포넌트
 *
 * @example
 * ```tsx
 * const [dt, setDt] = createSignal<DateTime | undefined>(new DateTime());
 * <DateTimeField value={dt()} onChange={setDt} />
 * <DateTimeField value={dt()} onChange={setDt} type="datetime-sec" />
 * ```
 */
export declare const DateTimeField: Component<DateTimeFieldProps>;
//# sourceMappingURL=datetime-field.d.ts.map
