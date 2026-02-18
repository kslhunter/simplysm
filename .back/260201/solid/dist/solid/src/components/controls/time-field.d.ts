import { type Component, type JSX } from "solid-js";
import { type TimeFieldStyles } from "./time-field.css";
import { Time } from "@simplysm/core-common";
import "@simplysm/core-common";
/**
 * TimeField 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property type - 입력 타입 (time: 시:분, time-sec: 시:분:초)
 * @property min - 선택 가능한 최소 시간
 * @property max - 선택 가능한 최대 시간
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property inline - true일 경우 inline-block으로 표시
 */
export interface TimeFieldProps
  extends
    Omit<
      JSX.InputHTMLAttributes<HTMLInputElement>,
      "value" | "onChange" | "type" | "min" | "max" | "size"
    >,
    TimeFieldStyles {
  value?: Time | undefined;
  onChange?: (value: Time | undefined) => void;
  type?: "time" | "time-sec";
  min?: Time;
  max?: Time;
}
/**
 * 시간 입력 필드 컴포넌트
 *
 * @example
 * ```tsx
 * const [time, setTime] = createSignal<Time | undefined>(new Time(10, 30, 0));
 * <TimeField value={time()} onChange={setTime} />
 * <TimeField value={time()} onChange={setTime} type="time-sec" />
 * ```
 */
export declare const TimeField: Component<TimeFieldProps>;
//# sourceMappingURL=time-field.d.ts.map
