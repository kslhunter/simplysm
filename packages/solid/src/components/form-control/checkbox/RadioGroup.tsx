import { type JSX, createContext, useContext } from "solid-js";
import { Radio } from "./Radio";
import type { CheckboxSize } from "./Checkbox.styles";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { SelectionGroupBase } from "./SelectionGroupBase";

interface RadioGroupContext {
  value: () => unknown | undefined;
  select: (item: unknown) => void;
  disabled: () => boolean;
  size: () => CheckboxSize | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

const RadioGroupCtx = createContext<RadioGroupContext>();

interface RadioGroupProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue | undefined) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

function RadioGroupInner<TValue = unknown>(props: RadioGroupProps<TValue>): JSX.Element {
  const [value, setValue] = createControllableSignal<unknown>({
    value: () => props.value as unknown,
    onChange: () => props.onValueChange as ((v: unknown) => void) | undefined,
  });

  const select = (item: unknown) => {
    setValue(item);
  };

  const contextValue: RadioGroupContext = {
    value,
    select,
    disabled: () => props.disabled ?? false,
    size: () => props.size,
    inline: () => props.inline ?? false,
    inset: () => props.inset ?? false,
  };

  return (
    <SelectionGroupBase
      context={RadioGroupCtx}
      contextValue={contextValue}
      errorMsgKey="validation.selectItem"
      value={props.value}
      isEmpty={(v) => v === undefined || v === null}
      validate={props.validate as ((value: any) => string | undefined) | undefined}
      required={props.required}
      lazyValidation={props.lazyValidation}
      class={props.class}
      style={props.style}
    >
      {props.children}
    </SelectionGroupBase>
  );
}

function RadioGroupItem<TValue = unknown>(props: {
  value: TValue;
  disabled?: boolean;
  children?: JSX.Element;
}): JSX.Element {
  const ctx = useContext(RadioGroupCtx);
  if (!ctx) throw new Error("RadioGroup.Item can only be used inside RadioGroup");

  const isSelected = () => ctx.value() === props.value;

  const handleChange = () => {
    ctx.select(props.value);
  };

  return (
    <Radio
      value={isSelected()}
      onValueChange={handleChange}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </Radio>
  );
}

interface RadioGroupComponent {
  <TValue = unknown>(props: RadioGroupProps<TValue>): JSX.Element;
  Item: <TValue = unknown>(props: {
    value: TValue;
    disabled?: boolean;
    children?: JSX.Element;
  }) => JSX.Element;
}

export const RadioGroup = Object.assign(RadioGroupInner, {
  Item: RadioGroupItem,
}) as RadioGroupComponent;
