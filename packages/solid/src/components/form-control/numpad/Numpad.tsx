import { type Component, type JSX, createSignal, createEffect, Show } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { Button } from "../Button";
import { NumberInput } from "../field/NumberInput";
import { Icon } from "../../display/Icon";
import { IconEraser, IconArrowLeft } from "@tabler/icons-solidjs";
import { gap, type ComponentSize } from "../../../styles/control.styles";
import { useI18n } from "../../../providers/i18n/I18nProvider";

export interface NumpadProps {
  /** Input value */
  value?: number;
  /** Value change callback */
  onValueChange?: (value: number | undefined) => void;
  /** Placeholder */
  placeholder?: string;
  /** Whether input is required */
  required?: boolean;
  /** Disable direct text field input */
  inputDisabled?: boolean;
  /** Show Enter button */
  withEnterButton?: boolean;
  /** Show minus button */
  withMinusButton?: boolean;
  /** Enter button click callback */
  onEnterButtonClick?: () => void;
  /** Size */
  size?: ComponentSize;
  /** Custom class */
  class?: string;
  /** Custom style */
  style?: JSX.CSSProperties;
}


/**
 * Parse inputStr and convert to number.
 * Returns undefined for empty string or "-" only.
 */
function parseInputStr(str: string): number | undefined {
  if (str === "" || str === "-" || str === "." || str === "-.") return undefined;
  const num = Number(str);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * Convert number to inputStr.
 */
function valueToInputStr(value: number | undefined): string {
  if (value == null) return "";
  return String(value);
}

export const Numpad: Component<NumpadProps> = (props) => {
  const i18n = useI18n();
  // Controlled/uncontrolled pattern
  const [value, setValue] = createControllableSignal({
    value: () => props.value,
    onChange: () => props.onValueChange,
  });

  // Internal input string state
  const [inputStr, setInputStr] = createSignal<string>("");
  // Prevent external value → inputStr sync when button input is in progress
  let isButtonInput = false;

  // Sync inputStr when external value changes (only when not in button input)
  createEffect(() => {
    const val = value();
    if (!isButtonInput) {
      setInputStr(valueToInputStr(val));
    }
    isButtonInput = false;
  });

  // Parse inputStr and apply to value
  const applyInputStr = (str: string) => {
    isButtonInput = true;
    setInputStr(str);
    setValue(parseInputStr(str));
  };

  // Digit buttons (0-9)
  const handleDigit = (digit: string) => {
    applyInputStr(inputStr() + digit);
  };

  // Decimal point button
  const handleDot = () => {
    const current = inputStr();
    if (current.includes(".")) return;
    applyInputStr(current + ".");
  };

  // C (Clear) button
  const handleClear = () => {
    applyInputStr("");
  };

  // BS (Backspace) button
  const handleBackspace = () => {
    const current = inputStr();
    if (current.length === 0) return;
    applyInputStr(current.slice(0, -1));
  };

  // - (Minus toggle) button
  const handleMinus = () => {
    const current = inputStr();
    if (current.startsWith("-")) {
      applyInputStr(current.slice(1));
    } else {
      applyInputStr("-" + current);
    }
  };

  // ENT button
  const handleEnter = () => {
    props.onEnterButtonClick?.();
  };

  // NumberInput value change handler
  const handleFieldValueChange = (val: number | undefined) => {
    setValue(val);
    setInputStr(valueToInputStr(val));
  };

  const buttonSize = () => props.size ?? "md";

  return (
    <div data-numpad class={twMerge(clsx("grid grid-cols-3", gap.sm, "w-auto"), props.class)} style={props.style}>
      {/* Row 1: NumberInput + optional ENT */}
      <div class={clsx("flex", props.withEnterButton ? "col-span-2" : "col-span-3")}>
        <NumberInput
          value={value()}
          onValueChange={handleFieldValueChange}
          placeholder={props.placeholder}
          readOnly={props.inputDisabled}
          size={buttonSize()}
          class="w-full"
          useGrouping={false}
        />
      </div>
      <Show when={props.withEnterButton}>
        <Button
          theme="primary"
          variant="solid"
          size={buttonSize()}
          disabled={props.required && value() == null}
          onClick={handleEnter}
        >
          {i18n.t("numpad.enter")}
        </Button>
      </Show>

      {/* Row 2: optional Minus + C + BS */}
      <Show when={props.withMinusButton}>
        <Button size={buttonSize()} onClick={handleMinus}>
          -
        </Button>
      </Show>
      <Button
        size={buttonSize()}
               onClick={handleClear}
        class={clsx(props.withMinusButton ? "col-span-1" : "col-span-2", "text-danger-500")}
      >
        <Icon icon={IconEraser} />
      </Button>
      <Button size={buttonSize()} onClick={handleBackspace} class="text-warning-500">
        <Icon icon={IconArrowLeft} />
      </Button>

      {/* Row 3: 7 8 9 */}
      <Button size={buttonSize()} onClick={() => handleDigit("7")}>
        7
      </Button>
      <Button size={buttonSize()} onClick={() => handleDigit("8")}>
        8
      </Button>
      <Button size={buttonSize()} onClick={() => handleDigit("9")}>
        9
      </Button>

      {/* Row 4: 4 5 6 */}
      <Button size={buttonSize()} onClick={() => handleDigit("4")}>
        4
      </Button>
      <Button size={buttonSize()} onClick={() => handleDigit("5")}>
        5
      </Button>
      <Button size={buttonSize()} onClick={() => handleDigit("6")}>
        6
      </Button>

      {/* Row 5: 1 2 3 */}
      <Button size={buttonSize()} onClick={() => handleDigit("1")}>
        1
      </Button>
      <Button size={buttonSize()} onClick={() => handleDigit("2")}>
        2
      </Button>
      <Button size={buttonSize()} onClick={() => handleDigit("3")}>
        3
      </Button>

      {/* Row 6: 0 (colspan 2) + . */}
      <Button size={buttonSize()} class="col-span-2" onClick={() => handleDigit("0")}>
        0
      </Button>
      <Button size={buttonSize()} onClick={handleDot}>
        .
      </Button>
    </div>
  );
};
