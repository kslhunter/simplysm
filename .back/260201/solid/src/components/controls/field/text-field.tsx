import { type Component, createSignal, type JSX, Show, splitProps } from "solid-js";
import { createFieldSignal } from "../../../hooks/createFieldSignal";
import {
  textField,
  textFieldContainer,
  textFieldContent,
  textFieldInput,
  type TextFieldStyles,
} from "./text-field.css";
import { objPick } from "@simplysm/core-common";
import "@simplysm/core-common";

/**
 * format 플레이스홀더 문자 매칭
 * 0: 숫자만 (0-9)
 * X: 영문 대문자 + 숫자 (A-Z, 0-9)
 * x: 영문 소문자 + 숫자 (a-z, 0-9)
 * *: 모든 문자
 */
const FORMAT_PLACEHOLDERS = /[0Xx*]/;

/**
 * 플레이스홀더 타입별 유효 문자 패턴
 */
const PLACEHOLDER_PATTERNS: Record<string, RegExp> = {
  "0": /[0-9]/,
  "X": /[A-Z0-9]/,
  "x": /[a-z0-9]/,
  "*": /./,
};

/**
 * raw 값에 format 패턴을 적용
 */
function applyFormat(raw: string, format: string): string {
  let result = "";
  let rawIndex = 0;

  for (const char of format) {
    if (rawIndex >= raw.length) break;

    if (FORMAT_PLACEHOLDERS.test(char)) {
      result += raw[rawIndex++];
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * 입력값에서 format에 맞지 않는 문자를 필터링하고 raw 값 추출
 */
function extractRaw(input: string, format: string): string {
  let result = "";
  let formatIndex = 0;

  for (const inputChar of input) {
    // 현재 포맷 위치에서 플레이스홀더가 아닌 문자는 건너뜀
    while (formatIndex < format.length && !FORMAT_PLACEHOLDERS.test(format[formatIndex])) {
      formatIndex++;
    }

    if (formatIndex >= format.length) break;

    const placeholder = format[formatIndex];
    const pattern = PLACEHOLDER_PATTERNS[placeholder];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (pattern != null && pattern.test(inputChar)) {
      result += inputChar;
      formatIndex++;
    }
  }

  return result;
}

/**
 * format이 숫자 전용인지 확인
 */
function isNumericFormat(format: string): boolean {
  for (const char of format) {
    if (FORMAT_PLACEHOLDERS.test(char) && char !== "0") {
      return false;
    }
  }
  return true;
}

/**
 * TextField 컴포넌트의 props
 * @property value - 현재 값 (onChange와 함께 사용 시 controlled, 단독 사용 시 초기값)
 * @property onChange - 값 변경 시 호출되는 콜백 (있으면 controlled 모드)
 * @property type - 입력 타입 (text, password, email)
 * @property format - 포맷 패턴 (예: "000-0000-0000")
 * @property size - 필드 크기 (sm, lg)
 * @property inset - true일 경우 테이블 셀 등에서 사용하기 위한 인셋 스타일 적용
 * @property inline - true일 경우 inline-block으로 표시
 */
export interface TextFieldProps
  extends
    Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size">,
    TextFieldStyles {
  value?: string | undefined;
  onChange?: (value: string | undefined) => void;
  type?: "text" | "password" | "email";
  format?: string;
}

/**
 * 텍스트 입력 필드 컴포넌트
 *
 * @example
 * ```tsx
 * const [text, setText] = createSignal<string | undefined>("hello");
 * <TextField value={text()} onChange={setText} />
 * <TextField value={text()} onChange={setText} type="password" />
 * <TextField value={text()} onChange={setText} format="000-0000-0000" />
 * ```
 */
export const TextField: Component<TextFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    ...textField.variants(),
    "class",
    "value",
    "onChange",
    "type",
    "format",
    "placeholder",
  ]);

  const [isFocused, setIsFocused] = createSignal(false);

  const [value, setValue] = createFieldSignal({
    value: () => local.value,
    onChange: () => local.onChange,
  });

  // 표시할 값 계산
  const displayValue = () => {
    const val = value() ?? "";
    if (local.format === undefined || local.format === "" || isFocused()) {
      return val;
    }
    return applyFormat(val, local.format);
  };

  // inputMode 결정
  const inputMode = (): JSX.HTMLAttributes<HTMLInputElement>["inputMode"] => {
    if (local.type === "email") return "email";
    if (local.format !== undefined && local.format !== "" && isNumericFormat(local.format)) {
      return "numeric";
    }
    return undefined;
  };

  // 입력 핸들러
  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    const input = e.currentTarget;
    let newValue: string | undefined = input.value;

    if (local.format !== undefined && local.format !== "") {
      // format이 있으면 raw 값만 추출
      newValue = extractRaw(newValue, local.format);
    }

    if (newValue === "") {
      newValue = undefined;
    }

    setValue(newValue);
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
    "type": local.type ?? "text",
    "value": displayValue(),
    "onInput": handleInput,
    "onFocus": handleFocus,
    "onBlur": handleBlur,
    "placeholder": local.placeholder,
    "inputMode": inputMode(),
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
          class={[textField(objPick(local, textField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      }
    >
      <div class={textFieldContainer}>
        <div class={textFieldContent}>
          {displayValue() !== "" ? displayValue() : (local.placeholder ?? "\u00A0")}
        </div>
        <input
          {...rest}
          {...inputProps()}
          class={[textFieldInput, textField(objPick(local, textField.variants())), local.class]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
    </Show>
  );
};
