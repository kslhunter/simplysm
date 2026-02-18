import { type Component, type JSX, Show, splitProps } from "solid-js";
import { createFieldSignal } from "../../../hooks/createFieldSignal";
import {
  type DateFieldStyles,
  dateField,
  dateFieldContainer,
  dateFieldContent,
  dateFieldInput,
} from "./date-field.css";
import { objPick, DateOnly } from "@simplysm/core-common";
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
export const DateField: Component<DateFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    ...dateField.variants(),
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

  // HTML input type 결정
  const inputType = () => {
    switch (local.type) {
      case "month":
        return "month";
      case "year":
        return "number"; // 네이티브 year picker가 없으므로 number 사용
      default:
        return "date";
    }
  };

  // 표시할 값 계산
  const inputValue = () => {
    const val = value();
    if (val === undefined) return "";

    switch (local.type) {
      case "month":
        return val.toFormatString("yyyy-MM");
      case "year":
        return String(val.year);
      default:
        return val.toFormatString("yyyy-MM-dd");
    }
  };

  // content용 표시 값 (inset 모드)
  const displayValue = () => {
    const val = value();
    if (val === undefined) return "";

    switch (local.type) {
      case "month":
        return val.toFormatString("yyyy-MM");
      case "year":
        return String(val.year);
      default:
        return val.toFormatString("yyyy-MM-dd");
    }
  };

  // min 값 계산
  const minValue = () => {
    if (local.min === undefined) return undefined;

    switch (local.type) {
      case "month":
        return local.min.toFormatString("yyyy-MM");
      case "year":
        return String(local.min.year);
      default:
        return local.min.toFormatString("yyyy-MM-dd");
    }
  };

  // max 값 계산
  const maxValue = () => {
    if (local.max === undefined) return undefined;

    switch (local.type) {
      case "month":
        return local.max.toFormatString("yyyy-MM");
      case "year":
        return String(local.max.year);
      default:
        return local.max.toFormatString("yyyy-MM-dd");
    }
  };

  // 변경 핸들러
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const input = e.currentTarget;

    if (input.value === "") {
      setValue(undefined);
      return;
    }

    try {
      let newValue: DateOnly | undefined;
      switch (local.type) {
        case "month": {
          // yyyy-MM 형식
          const parts = input.value.split("-").map(Number);
          const year = parts[0] as number | undefined;
          const month = parts[1] as number | undefined;
          if (
            year != null &&
            month != null &&
            !Number.isNaN(year) &&
            !Number.isNaN(month) &&
            month >= 1 &&
            month <= 12
          ) {
            newValue = new DateOnly(year, month, 1);
          }
          break;
        }
        case "year": {
          // 연도만
          const year = Number(input.value);
          if (!Number.isNaN(year) && year > 0 && year <= 9999) {
            newValue = new DateOnly(year, 1, 1);
          }
          break;
        }
        default: {
          // yyyy-MM-dd 형식
          newValue = DateOnly.parse(input.value);
        }
      }
      if (newValue !== undefined) {
        setValue(newValue);
      }
    } catch {
      // 파싱 실패 시 setValue 호출 안함
    }
  };

  // 공통 input props
  const inputProps = () => ({
    "type": inputType(),
    "value": inputValue(),
    "onChange": handleChange,
    "min": minValue(),
    "max": maxValue(),
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
          class={[dateField(objPick(local, dateField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      }
    >
      <div class={dateFieldContainer}>
        <div class={dateFieldContent}>
          {displayValue() !== "" ? displayValue() : (local.placeholder ?? "\u00A0")}
        </div>
        <input
          {...rest}
          {...inputProps()}
          class={[dateFieldInput, dateField(objPick(local, dateField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
    </Show>
  );
};
