import { type Component, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";
import {
  type FieldSize,
  fieldBaseClass,
  fieldSizeClasses,
  fieldErrorClass,
  fieldInsetClass,
  fieldDisabledClass,
  fieldReadonlyClass,
  fieldInputClass,
} from "./styles";

type TextFieldType = "text" | "password" | "email";

export interface TextFieldProps {
  /** 입력 값 */
  value?: string;

  /** 값 변경 콜백 */
  onValueChange?: (value: string) => void;

  /** 입력 타입 */
  type?: TextFieldType;

  /** 플레이스홀더 */
  placeholder?: string;

  /** 타이틀 (툴팁) */
  title?: string;

  /** 자동완성 */
  autocomplete?: string;

  /** 비활성화 */
  disabled?: boolean;

  /** 읽기 전용 */
  readonly?: boolean;

  /** 에러 상태 */
  error?: boolean;

  /** 사이즈 */
  size?: FieldSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 입력 포맷 (예: XXX-XXXX-XXXX) */
  format?: string;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * 값에 포맷을 적용한다
 * @param value 원본 값
 * @param format 포맷 문자열 (예: XXX-XXXX-XXXX)
 * @returns 포맷이 적용된 값
 */
function applyFormat(value: string, format: string): string {
  if (!value || !format) return value;

  let result = "";
  let valueIndex = 0;

  for (let i = 0; i < format.length && valueIndex < value.length; i++) {
    if (format[i] === "X") {
      result += value[valueIndex];
      valueIndex++;
    } else {
      result += format[i];
    }
  }

  return result;
}

/**
 * 포맷 문자를 제거하여 원본 값을 추출한다
 * @param formattedValue 포맷이 적용된 값
 * @param format 포맷 문자열
 * @returns 원본 값
 */
function removeFormat(formattedValue: string, format: string): string {
  if (!formattedValue || !format) return formattedValue;

  let result = "";

  for (let i = 0; i < formattedValue.length; i++) {
    const formatChar = format[i];
    if (formatChar === "X") {
      result += formattedValue[i];
    }
    // 포맷 문자가 아닌 경우 (구분자) 스킵
  }

  return result;
}

/**
 * TextField 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <TextField value={text()} onValueChange={setText} />
 *
 * // 포맷 적용
 * <TextField format="XXX-XXXX-XXXX" value={phone()} onValueChange={setPhone} />
 *
 * // password 타입
 * <TextField type="password" placeholder="비밀번호 입력" />
 * ```
 */
export const TextField: Component<TextFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "type",
    "placeholder",
    "title",
    "autocomplete",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "format",
    "class",
    "style",
  ]);

  // controlled/uncontrolled 패턴 지원
  const [value, setValue] = createPropSignal({
    value: () => local.value ?? "",
    onChange: () => local.onValueChange,
  });

  // 포맷이 적용된 표시 값
  const displayValue = () => {
    const val = value();
    if (local.format != null && local.format !== "") {
      return applyFormat(val, local.format);
    }
    return val;
  };

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    let newValue = e.currentTarget.value;

    if (local.format != null && local.format !== "") {
      // 포맷 문자 제거하여 원본 값 추출
      newValue = removeFormat(newValue, local.format);
    }

    setValue(newValue);
  };

  // wrapper 클래스
  const getWrapperClass = () =>
    twMerge(
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.inset && fieldInsetClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.class,
    );

  // disabled/readonly일 때 div로 표시
  const isDisplayMode = () => local.disabled || local.readonly;

  return (
    <Show
      when={!isDisplayMode()}
      fallback={
        <div {...rest} data-text-field class={twMerge(getWrapperClass(), "sd-text-field")} style={local.style} title={local.title}>
          {displayValue() || "\u00A0"}
        </div>
      }
    >
      <div {...rest} data-text-field class={getWrapperClass()} style={local.style}>
        <input
          type={local.type ?? "text"}
          class={fieldInputClass}
          value={displayValue()}
          placeholder={local.placeholder}
          title={local.title}
          autocomplete={local.autocomplete}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
