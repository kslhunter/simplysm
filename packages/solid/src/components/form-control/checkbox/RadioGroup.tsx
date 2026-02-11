import { type JSX, type ParentComponent, createContext, splitProps, useContext } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { Radio } from "./Radio";
import type { CheckboxSize, CheckboxTheme } from "./Checkbox.styles";

interface RadioGroupContextValue<T> {
  value: () => T | undefined;
  select: (item: T) => void;
  disabled: () => boolean;
  size: () => CheckboxSize | undefined;
  theme: () => CheckboxTheme | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue<any>>();

// --- RadioGroup.Item ---

interface RadioGroupItemProps<T> {
  value: T;
  disabled?: boolean;
  children?: JSX.Element;
}

function RadioGroupItemInner<T>(props: RadioGroupItemProps<T>) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error("RadioGroup.Item은 RadioGroup 내부에서만 사용할 수 있습니다");

  const isSelected = () => ctx.value() === props.value;

  return (
    <Radio
      value={isSelected()}
      onValueChange={() => ctx.select(props.value)}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      theme={ctx.theme()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </Radio>
  );
}

// --- RadioGroup ---

interface RadioGroupProps<T> {
  value?: T;
  onValueChange?: (value: T) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  theme?: CheckboxTheme;
  inline?: boolean;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

interface RadioGroupComponent {
  <T = unknown>(props: RadioGroupProps<T>): JSX.Element;
  Item: typeof RadioGroupItemInner;
}

const RadioGroupInner: ParentComponent<RadioGroupProps<unknown>> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "size",
    "theme",
    "inline",
    "inset",
    "class",
    "style",
    "children",
  ]);

  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  const select = (item: unknown) => {
    setValue(item);
  };

  const contextValue: RadioGroupContextValue<unknown> = {
    value,
    select,
    disabled: () => local.disabled ?? false,
    size: () => local.size,
    theme: () => local.theme,
    inline: () => local.inline ?? false,
    inset: () => local.inset ?? false,
  };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div {...rest} class={twMerge("inline-flex", local.class)} style={local.style}>
        {local.children}
      </div>
    </RadioGroupContext.Provider>
  );
};

export const RadioGroup = RadioGroupInner as unknown as RadioGroupComponent;
RadioGroup.Item = RadioGroupItemInner;
