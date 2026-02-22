import { type Component, createMemo, type JSX, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { Invalid } from "../Invalid";
import { type ComponentSize } from "../../../styles/tokens.styles";

// 기본 스타일
const baseClass = clsx(
  "size-field",
  "rounded",
  "border border-black/10 dark:border-white/10",
  "cursor-pointer",
  // color input 기본 스타일 제거
  "[&::-webkit-color-swatch-wrapper]:p-0",
  "[&::-webkit-color-swatch]:border-none",
  "[&::-webkit-color-swatch]:rounded-none",
  "[&::-moz-color-swatch]:border-none",
  "[&::-moz-color-swatch]:rounded-none",
);

// 사이즈별 스타일
const sizeClasses: Record<ComponentSize, string> = {
  xs: "size-field-xs",
  sm: "size-field-sm",
  lg: "size-field-lg",
  xl: "size-field-xl",
};

// disabled 스타일 - 대각선 줄무늬로 표시
// eslint-disable-next-line tailwindcss/enforces-shorthand
const disabledClass = clsx(
  "cursor-default",
  "relative",
  "before:absolute before:bottom-0 before:left-0 before:right-0 before:top-0",
  "before:bg-[linear-gradient(45deg,transparent_40%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.4)_60%,transparent_60%)]",
);

export interface ColorPickerProps {
  /** 색상 값 (#RRGGBB 형식) */
  value?: string;

  /** 값 변경 콜백 */
  onValueChange?: (value: string) => void;

  /** 타이틀 (툴팁) */
  title?: string;

  /** 비활성화 */
  disabled?: boolean;

  /** 사이즈 */
  size?: ComponentSize;

  /** inset 모드 (DataSheet 셀 내부 등) */
  inset?: boolean;

  /** 필수 입력 여부 */
  required?: boolean;

  /** 커스텀 유효성 검사 함수 */
  validate?: (value: string | undefined) => string | undefined;

  /** touchMode: 포커스 해제 후에만 에러 표시 */
  touchMode?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

/**
 * ColorPicker 컴포넌트
 *
 * @example
 * ```tsx
 * <ColorPicker value={color()} onValueChange={setColor} />
 * ```
 */
export const ColorPicker: Component<ColorPickerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "title",
    "disabled",
    "size",
    "inset",
    "required",
    "validate",
    "touchMode",
    "class",
    "style",
  ]);

  const [value, setValue] = createControllableSignal({
    value: () => local.value ?? "#000000",
    onChange: () => local.onValueChange,
  });

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    setValue(e.currentTarget.value);
  };

  const getClassName = () =>
    twMerge(
      baseClass,
      local.size && sizeClasses[local.size],
      local.disabled && disabledClass,
      local.class,
    );

  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && v === "") return "필수 입력 항목입니다";
    return local.validate?.(v);
  });

  return (
    <Invalid
      variant={local.inset ? "dot" : "border"}
      message={errorMsg()}
      touchMode={local.touchMode}
    >
      <input
        {...rest}
        data-color-picker
        type="color"
        class={getClassName()}
        style={local.style}
        value={value()}
        title={local.title}
        disabled={local.disabled}
        onInput={handleInput}
      />
    </Invalid>
  );
};
