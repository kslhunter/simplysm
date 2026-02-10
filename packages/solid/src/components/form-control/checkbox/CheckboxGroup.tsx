import { type JSX, type ParentComponent, createContext, splitProps, useContext } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../utils/createControllableSignal";
import { Checkbox } from "./Checkbox";
import type { CheckboxSize, CheckboxTheme } from "./Checkbox.styles";

interface CheckboxGroupContextValue<T> {
  value: () => T[];
  toggle: (item: T) => void;
  disabled: () => boolean;
  size: () => CheckboxSize | undefined;
  theme: () => CheckboxTheme | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

const CheckboxGroupContext = createContext<CheckboxGroupContextValue<any>>();

// --- CheckboxGroup.Item ---

interface CheckboxGroupItemProps<T> {
  value: T;
  disabled?: boolean;
  children?: JSX.Element;
}

function CheckboxGroupItemInner<T>(props: CheckboxGroupItemProps<T>) {
  const ctx = useContext(CheckboxGroupContext);
  if (!ctx) throw new Error("CheckboxGroup.Item must be used inside CheckboxGroup");

  const isSelected = () => ctx.value().includes(props.value);

  return (
    <Checkbox
      value={isSelected()}
      onValueChange={() => ctx.toggle(props.value)}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      theme={ctx.theme()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </Checkbox>
  );
}

// --- CheckboxGroup ---

interface CheckboxGroupProps<T> {
  value?: T[];
  onValueChange?: (value: T[]) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  theme?: CheckboxTheme;
  inline?: boolean;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

interface CheckboxGroupComponent {
  <T = unknown>(props: CheckboxGroupProps<T>): JSX.Element;
  Item: typeof CheckboxGroupItemInner;
}

const CheckboxGroupInner: ParentComponent<CheckboxGroupProps<unknown>> = (props) => {
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
    value: () => local.value ?? [],
    onChange: () => local.onValueChange,
  });

  const toggle = (item: unknown) => {
    setValue((prev) => {
      if (prev.includes(item)) {
        return prev.filter((v) => v !== item);
      }
      return [...prev, item];
    });
  };

  const contextValue: CheckboxGroupContextValue<unknown> = {
    value,
    toggle,
    disabled: () => local.disabled ?? false,
    size: () => local.size,
    theme: () => local.theme,
    inline: () => local.inline ?? false,
    inset: () => local.inset ?? false,
  };

  return (
    <CheckboxGroupContext.Provider value={contextValue}>
      <div {...rest} class={twMerge("inline-flex", local.class)} style={local.style}>
        {local.children}
      </div>
    </CheckboxGroupContext.Provider>
  );
};

export const CheckboxGroup = CheckboxGroupInner as unknown as CheckboxGroupComponent;
CheckboxGroup.Item = CheckboxGroupItemInner;
