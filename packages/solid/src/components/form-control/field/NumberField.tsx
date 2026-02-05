import { type Component, type JSX, Show, splitProps, createSignal, createEffect } from "solid-js";
import clsx from "clsx";
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

// NumberField 전용 input 스타일 (우측 정렬 + 스피너 숨김)
const numberInputClass = clsx(
  fieldInputClass,
  "text-right",
  "[&::-webkit-outer-spin-button]:appearance-none",
  "[&::-webkit-inner-spin-button]:appearance-none",
);

export interface NumberFieldProps {
  /** 입력 값 */
  value?: number;

  /** 값 변경 콜백 */
  onValueChange?: (value: number | undefined) => void;

  /** 천단위 콤마 표시 (기본값: true) */
  useComma?: boolean;

  /** 최소 소수점 자릿수 */
  minDigits?: number;

  /** 최소값 */
  min?: number;

  /** 최대값 */
  max?: number;

  /** 증감 단위 */
  step?: number;

  /** 플레이스홀더 */
  placeholder?: string;

  /** 타이틀 (툴팁) */
  title?: string;

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

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * 숫자를 표시용 문자열로 변환한다
 * @param value 숫자 값
 * @param useComma 천단위 콤마 사용 여부
 * @param minDigits 최소 소수점 자릿수
 * @returns 표시용 문자열
 */
function formatNumber(value: number | undefined, useComma: boolean, minDigits?: number): string {
  if (value == null) return "";

  let result: string;

  if (minDigits != null && minDigits > 0) {
    // 현재 소수점 자릿수 확인
    const valueStr = String(value);
    const decimalIndex = valueStr.indexOf(".");
    const currentDigits = decimalIndex >= 0 ? valueStr.length - decimalIndex - 1 : 0;

    // 최소 자릿수보다 작으면 패딩
    if (currentDigits < minDigits) {
      result = value.toFixed(minDigits);
    } else {
      result = valueStr;
    }
  } else {
    result = String(value);
  }

  if (useComma) {
    // 정수부와 소수부 분리
    const dotIndex = result.indexOf(".");
    const integerPart = dotIndex >= 0 ? result.slice(0, dotIndex) : result;
    const decimalPart = dotIndex >= 0 ? result.slice(dotIndex + 1) : null;
    // 정수부에만 콤마 추가
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    result = decimalPart !== null ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  }

  return result;
}

/**
 * 표시용 문자열을 숫자로 변환한다
 * @param str 표시용 문자열
 * @returns 숫자 값 또는 undefined
 */
function parseNumber(str: string): number | undefined {
  if (str === "" || str === "-") return undefined;

  // 콤마 제거
  const cleanStr = str.replace(/,/g, "");

  // 숫자로 변환 시도
  const num = Number(cleanStr);

  if (Number.isNaN(num)) return undefined;

  return num;
}

/**
 * 입력 문자열이 유효한 숫자 형식인지 확인한다
 * @param str 입력 문자열
 * @returns 유효 여부
 */
function isValidNumberInput(str: string): boolean {
  if (str === "" || str === "-" || str === ".") return true;

  // 콤마 제거
  const cleanStr = str.replace(/,/g, "");

  // 숫자 형식 패턴 (입력 중 상태 포함)
  // 예: "123", "123.", "123.45", "-123", "-", "-.123"
  return /^-?\d*\.?\d*$/.test(cleanStr);
}

/**
 * NumberField 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <NumberField value={num()} onValueChange={setNum} />
 *
 * // 천단위 콤마 없이
 * <NumberField value={num()} useComma={false} />
 *
 * // 최소 소수점 자릿수 지정
 * <NumberField value={price()} minDigits={2} />
 * ```
 */
export const NumberField: Component<NumberFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "useComma",
    "minDigits",
    "min",
    "max",
    "step",
    "placeholder",
    "title",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "class",
    "style",
  ]);

  void rest;

  // 입력 중인 상태를 추적하기 위한 내부 문자열 상태
  const [inputStr, setInputStr] = createSignal<string>("");
  const [isEditing, setIsEditing] = createSignal(false);

  // controlled/uncontrolled 패턴 지원
  const [value, setValue] = createPropSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  // 외부 값 변경 시 입력 문자열 동기화
  createEffect(() => {
    const val = value();
    if (!isEditing()) {
      setInputStr(formatNumber(val, local.useComma ?? true, local.minDigits));
    }
  });

  // 표시 값 계산
  const displayValue = () => {
    if (isEditing()) {
      return inputStr();
    }
    return formatNumber(value(), local.useComma ?? true, local.minDigits);
  };

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value;

    // 유효한 숫자 형식인지 확인
    if (!isValidNumberInput(newValue)) {
      // 유효하지 않은 입력은 무시하고 이전 값 복원
      e.currentTarget.value = inputStr();
      return;
    }

    setInputStr(newValue);
    setIsEditing(true);

    // 숫자로 변환
    const num = parseNumber(newValue);
    setValue(num);
  };

  // focus 핸들러
  const handleFocus: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = () => {
    setIsEditing(true);
    // focus 시 콤마 제거된 값으로 설정
    const val = value();
    if (val != null) {
      setInputStr(String(val));
    }
  };

  // blur 핸들러
  const handleBlur: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = () => {
    setIsEditing(false);
    // blur 시 포맷팅 적용
    setInputStr(formatNumber(value(), local.useComma ?? true, local.minDigits));
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
        <div
          class={twMerge(getWrapperClass(), "sd-number-field", "justify-end")}
          style={local.style}
          title={local.title}
        >
          {formatNumber(value(), local.useComma ?? true, local.minDigits) || "\u00A0"}
        </div>
      }
    >
      <div class={getWrapperClass()} style={local.style}>
        <input
          type="text"
          inputmode="numeric"
          class={numberInputClass}
          value={displayValue()}
          placeholder={local.placeholder}
          title={local.title}
          min={local.min}
          max={local.max}
          step={local.step}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
    </Show>
  );
};
