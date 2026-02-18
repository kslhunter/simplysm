import { type Component, type JSX, Show, splitProps } from "solid-js";
import { createFieldSignal } from "../../../hooks/createFieldSignal";
import {
  type TimeFieldStyles,
  timeField,
  timeFieldContainer,
  timeFieldContent,
  timeFieldInput,
} from "./time-field.css";
import { objPick, Time } from "@simplysm/core-common";
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
export const TimeField: Component<TimeFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    ...timeField.variants(),
    "class",
    "value",
    "onChange",
    "type",
    "min",
    "max",
    "placeholder",
  ]);

  const [value, setValue] = createFieldSignal({
    value: () => local.value,
    onChange: () => local.onChange,
  });

  // step 결정 (초 단위 표시 여부)
  const step = () => (local.type === "time-sec" ? "1" : undefined);

  // 표시할 값 계산
  const inputValue = () => {
    const val = value();
    if (val === undefined) return "";

    if (local.type === "time-sec") {
      return val.toFormatString("HH:mm:ss");
    }
    return val.toFormatString("HH:mm");
  };

  // content용 표시 값 (inset 모드)
  const displayValue = () => {
    const val = value();
    if (val === undefined) return "";

    if (local.type === "time-sec") {
      return val.toFormatString("HH:mm:ss");
    }
    return val.toFormatString("HH:mm");
  };

  // min 값 계산
  const minValue = () => {
    if (local.min === undefined) return undefined;

    if (local.type === "time-sec") {
      return local.min.toFormatString("HH:mm:ss");
    }
    return local.min.toFormatString("HH:mm");
  };

  // max 값 계산
  const maxValue = () => {
    if (local.max === undefined) return undefined;

    if (local.type === "time-sec") {
      return local.max.toFormatString("HH:mm:ss");
    }
    return local.max.toFormatString("HH:mm");
  };

  // 변경 핸들러
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const input = e.currentTarget;

    if (input.value === "") {
      setValue(undefined);
      return;
    }

    try {
      // HH:mm 또는 HH:mm:ss 형식
      const parts = input.value.split(":").map(Number);
      if (parts.length >= 2) {
        const hour = parts[0] as number | undefined;
        const minute = parts[1] as number | undefined;
        const second = parts[2] ?? 0;
        if (
          hour !== undefined &&
          minute !== undefined &&
          !Number.isNaN(hour) &&
          !Number.isNaN(minute) &&
          !Number.isNaN(second) &&
          hour >= 0 &&
          hour <= 23 &&
          minute >= 0 &&
          minute <= 59 &&
          second >= 0 &&
          second <= 59
        ) {
          const newValue = new Time(hour, minute, second);
          setValue(newValue);
        }
      }
    } catch {
      // 파싱 실패 시 setValue 호출 안함
    }
  };

  // 공통 input props
  const inputProps = () => ({
    "type": "time" as const,
    "value": inputValue(),
    "onChange": handleChange,
    "min": minValue(),
    "max": maxValue(),
    "step": step(),
    "placeholder": local.placeholder,
    "aria-disabled": rest.disabled ? ("true" as const) : undefined,
    "aria-readonly": rest.readOnly ? ("true" as const) : undefined,
  });

  return (
    <Show
      when={local.inline}
      fallback={
        <input
          {...rest}
          {...inputProps()}
          class={[timeField(objPick(local, timeField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      }
    >
      <div class={timeFieldContainer}>
        <div class={timeFieldContent}>
          {displayValue() !== "" ? displayValue() : (local.placeholder ?? "\u00A0")}
        </div>
        <input
          {...rest}
          {...inputProps()}
          class={[timeFieldInput, timeField(objPick(local, timeField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
    </Show>
  );
};
