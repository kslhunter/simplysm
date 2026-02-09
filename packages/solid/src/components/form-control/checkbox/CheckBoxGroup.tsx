import { type JSX, type ParentComponent, createContext, splitProps, useContext } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";
import { CheckBox } from "./CheckBox";
import type { CheckBoxSize, CheckBoxTheme } from "./CheckBox.styles";

interface CheckBoxGroupContextValue<T> {
  value: () => T[];
  toggle: (item: T) => void;
  disabled: () => boolean;
  size: () => CheckBoxSize | undefined;
  theme: () => CheckBoxTheme | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

const CheckBoxGroupContext = createContext<CheckBoxGroupContextValue<any>>();

// --- CheckBoxGroup.Item ---

interface CheckBoxGroupItemProps<T> {
  value: T;
  disabled?: boolean;
  children?: JSX.Element;
}

function CheckBoxGroupItemInner<T>(props: CheckBoxGroupItemProps<T>) {
  const ctx = useContext(CheckBoxGroupContext);
  if (!ctx) throw new Error("CheckBoxGroup.Item must be used inside CheckBoxGroup");

  const isSelected = () => ctx.value().includes(props.value);

  return (
    <CheckBox
      value={isSelected()}
      onValueChange={() => ctx.toggle(props.value)}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      theme={ctx.theme()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </CheckBox>
  );
}

// --- CheckBoxGroup ---

interface CheckBoxGroupProps<T> {
  value?: T[];
  onValueChange?: (value: T[]) => void;
  disabled?: boolean;
  size?: CheckBoxSize;
  theme?: CheckBoxTheme;
  inline?: boolean;
  inset?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

interface CheckBoxGroupComponent {
  <T = unknown>(props: CheckBoxGroupProps<T>): JSX.Element;
  Item: typeof CheckBoxGroupItemInner;
}

const CheckBoxGroupInner: ParentComponent<CheckBoxGroupProps<unknown>> = (props) => {
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

  const [value, setValue] = createPropSignal({
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

  const contextValue: CheckBoxGroupContextValue<unknown> = {
    value,
    toggle,
    disabled: () => local.disabled ?? false,
    size: () => local.size,
    theme: () => local.theme,
    inline: () => local.inline ?? false,
    inset: () => local.inset ?? false,
  };

  return (
    <CheckBoxGroupContext.Provider value={contextValue}>
      <div
        {...rest}
        class={twMerge("inline-flex", local.class)}
        style={local.style}
      >
        {local.children}
      </div>
    </CheckBoxGroupContext.Provider>
  );
};

export const CheckBoxGroup = CheckBoxGroupInner as unknown as CheckBoxGroupComponent;
CheckBoxGroup.Item = CheckBoxGroupItemInner;
