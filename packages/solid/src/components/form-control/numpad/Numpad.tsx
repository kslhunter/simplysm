import { type Component, type JSX, createSignal, createEffect, splitProps, Show } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";
import { Button } from "../Button";
import { NumberField } from "../field/NumberField";
import { Icon } from "../../display/Icon";
import { IconEraser, IconArrowLeft } from "@tabler/icons-solidjs";
import type { ComponentSize } from "../../../styles/tokens.styles";

export interface NumpadProps {
  /** 입력 값 */
  value?: number;
  /** 값 변경 콜백 */
  onValueChange?: (value: number | undefined) => void;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 필수 입력 여부 */
  required?: boolean;
  /** 텍스트 필드 직접 입력 비활성화 */
  inputDisabled?: boolean;
  /** ENT 버튼 표시 */
  useEnterButton?: boolean;
  /** - 버튼 표시 */
  useMinusButton?: boolean;
  /** ENT 클릭 콜백 */
  onEnterButtonClick?: () => void;
  /** 사이즈 */
  size?: ComponentSize;
  /** 커스텀 class */
  class?: string;
  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

const baseClass = clsx(
  "grid grid-cols-3",
  "gap-0.5",
  "w-auto",
);

/**
 * inputStr을 파싱하여 숫자로 변환한다.
 * 빈 문자열이나 "-"만 있는 경우 undefined를 반환한다.
 */
function parseInputStr(str: string): number | undefined {
  if (str === "" || str === "-" || str === "." || str === "-.") return undefined;
  const num = Number(str);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * 숫자를 inputStr로 변환한다.
 */
function valueToInputStr(value: number | undefined): string {
  if (value == null) return "";
  return String(value);
}

export const Numpad: Component<NumpadProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "placeholder",
    "required",
    "inputDisabled",
    "useEnterButton",
    "useMinusButton",
    "onEnterButtonClick",
    "size",
    "class",
    "style",
  ]);

  // controlled/uncontrolled 패턴
  const [value, setValue] = createPropSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  // 내부 입력 문자열 상태
  const [inputStr, setInputStr] = createSignal<string>("");

  // 외부 값 변경 시 inputStr 동기화
  createEffect(() => {
    const val = value();
    setInputStr(valueToInputStr(val));
  });

  // inputStr을 파싱하여 value로 반영
  const applyInputStr = (str: string) => {
    setInputStr(str);
    setValue(parseInputStr(str));
  };

  // 숫자 버튼 (0-9)
  const handleDigit = (digit: string) => {
    applyInputStr(inputStr() + digit);
  };

  // 소수점 버튼
  const handleDot = () => {
    const current = inputStr();
    if (current.includes(".")) return;
    applyInputStr(current + ".");
  };

  // C (클리어) 버튼
  const handleClear = () => {
    setInputStr("");
    setValue(undefined);
  };

  // BS (백스페이스) 버튼
  const handleBackspace = () => {
    const current = inputStr();
    if (current.length === 0) return;
    applyInputStr(current.slice(0, -1));
  };

  // - (마이너스 토글) 버튼
  const handleMinus = () => {
    const current = inputStr();
    if (current.startsWith("-")) {
      applyInputStr(current.slice(1));
    } else {
      applyInputStr("-" + current);
    }
  };

  // ENT 버튼
  const handleEnter = () => {
    local.onEnterButtonClick?.();
  };

  // NumberField 값 변경 핸들러
  const handleFieldValueChange = (val: number | undefined) => {
    setValue(val);
    setInputStr(valueToInputStr(val));
  };

  const buttonSize = () => local.size ?? "lg";

  return (
    <div
      {...rest}
      data-numpad
      class={twMerge(baseClass, local.class)}
      style={local.style}
    >
      {/* Row 1: NumberField + optional ENT */}
      <div
        class={clsx(
          "flex",
          local.useEnterButton ? "col-span-2" : "col-span-3",
        )}
      >
        <NumberField
          value={value()}
          onValueChange={handleFieldValueChange}
          placeholder={local.placeholder}
          readonly={local.inputDisabled}
          inset
          class="w-full"
          comma={false}
        />
      </div>
      <Show when={local.useEnterButton}>
        <Button
          theme="primary"
          variant="solid"
          size={buttonSize()}
          inset
          disabled={local.required && value() == null}
          onClick={handleEnter}
        >
          ENT
        </Button>
      </Show>

      {/* Row 2: optional Minus + C + BS */}
      <Show when={local.useMinusButton}>
        <Button size={buttonSize()} inset onClick={handleMinus}>
          -
        </Button>
      </Show>
      <Button
        size={buttonSize()}
        inset
        onClick={handleClear}
        class={clsx(
          local.useMinusButton ? "col-span-1" : "col-span-2",
          "text-danger-500",
        )}
      >
        <Icon icon={IconEraser} />
      </Button>
      <Button
        size={buttonSize()}
        inset
        onClick={handleBackspace}
        class="text-warning-500"
      >
        <Icon icon={IconArrowLeft} />
      </Button>

      {/* Row 3: 7 8 9 */}
      <Button size={buttonSize()} inset onClick={() => handleDigit("7")}>7</Button>
      <Button size={buttonSize()} inset onClick={() => handleDigit("8")}>8</Button>
      <Button size={buttonSize()} inset onClick={() => handleDigit("9")}>9</Button>

      {/* Row 4: 4 5 6 */}
      <Button size={buttonSize()} inset onClick={() => handleDigit("4")}>4</Button>
      <Button size={buttonSize()} inset onClick={() => handleDigit("5")}>5</Button>
      <Button size={buttonSize()} inset onClick={() => handleDigit("6")}>6</Button>

      {/* Row 5: 1 2 3 */}
      <Button size={buttonSize()} inset onClick={() => handleDigit("1")}>1</Button>
      <Button size={buttonSize()} inset onClick={() => handleDigit("2")}>2</Button>
      <Button size={buttonSize()} inset onClick={() => handleDigit("3")}>3</Button>

      {/* Row 6: 0 (colspan 2) + . */}
      <Button size={buttonSize()} inset class="col-span-2" onClick={() => handleDigit("0")}>0</Button>
      <Button size={buttonSize()} inset onClick={handleDot}>.</Button>
    </div>
  );
};
