import { type JSX, createContext, useContext } from "solid-js";
import { Checkbox } from "./Checkbox";
import type { CheckboxSize } from "./Checkbox.styles";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { SelectionGroupBase } from "./SelectionGroupBase";

interface CheckboxGroupContext {
  value: () => unknown[];
  toggle: (item: unknown) => void;
  disabled: () => boolean;
  size: () => CheckboxSize | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

const CheckboxGroupCtx = createContext<CheckboxGroupContext>();

interface CheckboxGroupProps<TValue> {
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue[]) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

function CheckboxGroupInner<TValue = unknown>(props: CheckboxGroupProps<TValue>): JSX.Element {
  const [value, setValue] = createControllableSignal<unknown[]>({
    value: () => (props.value as unknown[]) ?? [],
    onChange: () => props.onValueChange as ((v: unknown[]) => void) | undefined,
  });

  const toggle = (item: unknown) => {
    setValue((prev) => {
      if (prev.includes(item)) return prev.filter((v) => v !== item);
      return [...prev, item];
    });
  };

  const contextValue: CheckboxGroupContext = {
    value,
    toggle,
    disabled: () => props.disabled ?? false,
    size: () => props.size,
    inline: () => props.inline ?? false,
    inset: () => props.inset ?? false,
  };

  return (
    <SelectionGroupBase
      context={CheckboxGroupCtx}
      contextValue={contextValue}
      errorMsgKey="validation.selectItem"
      value={props.value ?? []}
      isEmpty={(v) => (v as unknown[]).length === 0}
      validate={props.validate as ((value: any) => string | undefined) | undefined}
      required={props.required}
      touchMode={props.touchMode}
      class={props.class}
      style={props.style}
    >
      {props.children}
    </SelectionGroupBase>
  );
}

function CheckboxGroupItem<TValue = unknown>(props: {
  value: TValue;
  disabled?: boolean;
  children?: JSX.Element;
}): JSX.Element {
  const ctx = useContext(CheckboxGroupCtx);
  if (!ctx) throw new Error("CheckboxGroup.Item can only be used inside CheckboxGroup");

  const isSelected = () => ctx.value().includes(props.value);

  const handleChange = () => {
    ctx.toggle(props.value);
  };

  return (
    <Checkbox
      value={isSelected()}
      onValueChange={handleChange}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </Checkbox>
  );
}

interface CheckboxGroupComponent {
  <TValue = unknown>(props: CheckboxGroupProps<TValue>): JSX.Element;
  Item: <TValue = unknown>(props: {
    value: TValue;
    disabled?: boolean;
    children?: JSX.Element;
  }) => JSX.Element;
}

export const CheckboxGroup = Object.assign(CheckboxGroupInner, {
  Item: CheckboxGroupItem,
}) as CheckboxGroupComponent;
