import { type Component, createSignal, type JSX, Show, splitProps } from "solid-js";
import { createFieldSignal } from "../../../hooks/createFieldSignal";
import {
  numberField,
  numberFieldContainer,
  numberFieldContent,
  numberFieldInput,
  type NumberFieldStyles,
} from "./number-field.css";
import { numParseFloat, objPick } from "@simplysm/core-common";
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
export const NumberField: Component<NumberFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    ...numberField.variants(),
    "class",
    "value",
    "onChange",
    "useNumberComma",
    "minDigits",
    "placeholder",
  ]);

  const [isFocused, setIsFocused] = createSignal(false);

  const [value, setValue] = createFieldSignal({
    value: () => local.value,
    onChange: () => local.onChange,
  });

  // 표시할 값 계산
  const displayValue = () => {
    const val = value();
    if (val === undefined) return "";

    // 포커스 중이면 raw 값 표시
    if (isFocused()) {
      return String(val);
    }

    let result: string;

    // minDigits 적용
    if (local.minDigits !== undefined && local.minDigits > 0) {
      const isNegative = val < 0;
      const absStr = String(Math.abs(val));

      // 정수 부분만 패딩
      const parts = absStr.split(".");
      let intPart = parts[0].padStart(local.minDigits, "0");
      const decPart = parts[1];

      // 콤마 포맷도 함께 적용
      if (local.useNumberComma) {
        intPart = Number(intPart).toLocaleString();
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const formatted = decPart != null ? `${intPart}.${decPart}` : intPart;
      result = isNegative ? `-${formatted}` : formatted;
    } else if (local.useNumberComma) {
      // 콤마 포맷만 적용
      result = val.toLocaleString(undefined, { maximumFractionDigits: 10 });
    } else {
      result = String(val);
    }

    return result;
  };

  // 입력 핸들러
  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    const input = e.currentTarget;
    const raw = input.value;

    // 빈 입력이면 undefined
    if (raw === "" || raw === "-") {
      setValue(undefined);
      return;
    }

    // 숫자 파싱
    const num = numParseFloat(raw);
    if (num !== undefined) {
      setValue(num);
    }
    // NaN이면 setValue 호출 안함 (이전 값 유지)
  };

  // 포커스 핸들러
  const handleFocus: JSX.EventHandler<HTMLInputElement, FocusEvent> = (e) => {
    setIsFocused(true);
    if (typeof rest.onFocus === "function") {
      (rest.onFocus as (e: FocusEvent) => void)(e);
    }
  };

  // 블러 핸들러
  const handleBlur: JSX.EventHandler<HTMLInputElement, FocusEvent> = (e) => {
    setIsFocused(false);
    if (typeof rest.onBlur === "function") {
      (rest.onBlur as (e: FocusEvent) => void)(e);
    }
  };

  // 공통 input props
  const inputProps = () => ({
    "type": "text" as const,
    "inputMode": "decimal" as const,
    "value": displayValue(),
    "onInput": handleInput,
    "onFocus": handleFocus,
    "onBlur": handleBlur,
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
          class={[numberField(objPick(local, numberField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      }
    >
      <div class={numberFieldContainer}>
        <div class={numberFieldContent}>
          {displayValue() !== "" ? displayValue() : (local.placeholder ?? "\u00A0")}
        </div>
        <input
          {...rest}
          {...inputProps()}
          class={[
            numberFieldInput,
            numberField(objPick(local, numberField.variants())),
            local.class,
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
    </Show>
  );
};
