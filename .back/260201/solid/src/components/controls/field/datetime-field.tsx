import { type Component, type JSX, Show, splitProps } from "solid-js";
import { createFieldSignal } from "../../../hooks/createFieldSignal";
import {
  type DateTimeFieldStyles,
  dateTimeField,
  dateTimeFieldContainer,
  dateTimeFieldContent,
  dateTimeFieldInput,
} from "./datetime-field.css";
import { objPick, DateTime } from "@simplysm/core-common";
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
export const DateTimeField: Component<DateTimeFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    ...dateTimeField.variants(),
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
  const step = () => (local.type === "datetime-sec" ? "1" : undefined);

  // 표시할 값 계산
  const inputValue = () => {
    const val = value();
    if (val === undefined) return "";

    if (local.type === "datetime-sec") {
      return val.toFormatString("yyyy-MM-ddTHH:mm:ss");
    }
    return val.toFormatString("yyyy-MM-ddTHH:mm");
  };

  // content용 표시 값 (inset 모드)
  const displayValue = () => {
    const val = value();
    if (val === undefined) return "";

    if (local.type === "datetime-sec") {
      return val.toFormatString("yyyy-MM-dd HH:mm:ss");
    }
    return val.toFormatString("yyyy-MM-dd HH:mm");
  };

  // min 값 계산
  const minValue = () => {
    if (local.min === undefined) return undefined;

    if (local.type === "datetime-sec") {
      return local.min.toFormatString("yyyy-MM-ddTHH:mm:ss");
    }
    return local.min.toFormatString("yyyy-MM-ddTHH:mm");
  };

  // max 값 계산
  const maxValue = () => {
    if (local.max === undefined) return undefined;

    if (local.type === "datetime-sec") {
      return local.max.toFormatString("yyyy-MM-ddTHH:mm:ss");
    }
    return local.max.toFormatString("yyyy-MM-ddTHH:mm");
  };

  // 변경 핸들러
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const input = e.currentTarget;

    if (input.value === "") {
      setValue(undefined);
      return;
    }

    try {
      // yyyy-MM-ddTHH:mm 또는 yyyy-MM-ddTHH:mm:ss 형식
      const splitParts = input.value.split("T");
      const datePart = splitParts[0] as string | undefined;
      const timePart = splitParts[1] as string | undefined;
      if (datePart != null && datePart !== "" && timePart != null && timePart !== "") {
        const dateComponents = datePart.split("-").map(Number);
        const year = dateComponents[0] as number | undefined;
        const month = dateComponents[1] as number | undefined;
        const day = dateComponents[2] as number | undefined;
        const timeParts = timePart.split(":").map(Number);
        const hour = timeParts[0] as number | undefined;
        const minute = timeParts[1] as number | undefined;
        const second = timeParts[2] ?? 0;

        if (
          year !== undefined &&
          month !== undefined &&
          day !== undefined &&
          hour !== undefined &&
          minute !== undefined &&
          !Number.isNaN(year) &&
          !Number.isNaN(month) &&
          !Number.isNaN(day) &&
          !Number.isNaN(hour) &&
          !Number.isNaN(minute) &&
          !Number.isNaN(second) &&
          month >= 1 &&
          month <= 12 &&
          day >= 1 &&
          day <= 31 &&
          hour >= 0 &&
          hour <= 23 &&
          minute >= 0 &&
          minute <= 59 &&
          second >= 0 &&
          second <= 59
        ) {
          const newValue = new DateTime(year, month, day, hour, minute, second);
          setValue(newValue);
        }
      }
    } catch {
      // 파싱 실패 시 setValue 호출 안함
    }
  };

  // 공통 input props
  const inputProps = () => ({
    "type": "datetime-local" as const,
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
          class={[dateTimeField(objPick(local, dateTimeField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      }
    >
      <div class={dateTimeFieldContainer}>
        <div class={dateTimeFieldContent}>
          {displayValue() !== "" ? displayValue() : (local.placeholder ?? "\u00A0")}
        </div>
        <input
          {...rest}
          {...inputProps()}
          class={[
            dateTimeFieldInput,
            dateTimeField(objPick(local, dateTimeField.variants())),
            local.class,
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
    </Show>
  );
};
