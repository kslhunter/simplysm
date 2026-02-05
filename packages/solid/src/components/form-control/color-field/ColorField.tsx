import { type Component, type JSX, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";

type ColorFieldSize = "sm" | "lg";

// 기본 wrapper 스타일
const baseClass = clsx(
  "inline-flex items-center justify-center",
  "border border-neutral-300 dark:border-neutral-600",
  "rounded",
  "bg-white dark:bg-transparent",
  "focus-within:border-primary-400 dark:focus-within:border-primary-400",
  "overflow-hidden",
  "size-8",
);

// 사이즈별 스타일
const sizeClasses: Record<ColorFieldSize, string> = {
  sm: clsx("size-6"),
  lg: clsx("size-10"),
};

// 에러 스타일
const errorClass = clsx("border-danger-500 dark:border-danger-500");

// inset 스타일
const insetClass = clsx("rounded-none border-none");

// disabled 스타일
const disabledClass = clsx("bg-neutral-100 dark:bg-neutral-800");

// input 스타일 (color input 기본 스타일 리셋)
const inputClass = clsx(
  "size-full",
  "cursor-pointer",
  "border-none",
  // color input 기본 스타일 제거
  "[&::-webkit-color-swatch-wrapper]:p-0",
  "[&::-webkit-color-swatch]:border-none",
  "[&::-moz-color-swatch]:border-none",
);

export interface ColorFieldProps {
  /** 색상 값 (#RRGGBB 형식) */
  value?: string;

  /** 값 변경 콜백 */
  onValueChange?: (value: string) => void;

  /** 타이틀 (툴팁) */
  title?: string;

  /** 비활성화 */
  disabled?: boolean;

  /** 읽기 전용 */
  readonly?: boolean;

  /** 에러 상태 */
  error?: boolean;

  /** 사이즈 */
  size?: ColorFieldSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * ColorField 컴포넌트
 *
 * HTML color picker를 사용하여 색상을 선택할 수 있는 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <ColorField value={color()} onValueChange={setColor} />
 *
 * // 사이즈 지정
 * <ColorField size="lg" value="#ff0000" />
 *
 * // 읽기 전용
 * <ColorField readonly value="#00ff00" />
 * ```
 */
export const ColorField: Component<ColorFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
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

  // controlled/uncontrolled 패턴 지원
  const [value, setValue] = createPropSignal({
    value: () => local.value ?? "#000000",
    onChange: () => local.onValueChange,
  });

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    setValue(e.currentTarget.value);
  };

  // wrapper 클래스
  const getWrapperClass = () =>
    twMerge(
      baseClass,
      local.size && sizeClasses[local.size],
      local.error && errorClass,
      local.inset && insetClass,
      (local.disabled || local.readonly) && disabledClass,
      local.class,
    );

  // disabled/readonly일 때 div로 표시
  const isDisplayMode = () => local.disabled || local.readonly;

  return (
    <Show
      when={!isDisplayMode()}
      fallback={
        <div class={twMerge(getWrapperClass(), "sd-color-field")} style={local.style} title={local.title}>
          <div class="size-full" style={{ "background-color": value() }} />
        </div>
      }
    >
      <div class={getWrapperClass()} style={local.style}>
        <input type="color" class={inputClass} value={value()} title={local.title} onInput={handleInput} />
      </div>
    </Show>
  );
};
