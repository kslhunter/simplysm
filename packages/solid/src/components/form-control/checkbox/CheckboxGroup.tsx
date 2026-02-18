import {
  type JSX,
  type ParentComponent,
  createContext,
  createMemo,
  splitProps,
  useContext,
} from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { Checkbox } from "./Checkbox";
import type { CheckboxSize } from "./Checkbox.styles";
import { Invalid } from "../Invalid";

interface CheckboxGroupContextValue<TValue> {
  value: () => TValue[];
  toggle: (item: TValue) => void;
  disabled: () => boolean;
  size: () => CheckboxSize | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

const CheckboxGroupContext = createContext<CheckboxGroupContextValue<any>>();

// --- CheckboxGroup.Item ---

interface CheckboxGroupItemProps<TValue> {
  value: TValue;
  disabled?: boolean;
  children?: JSX.Element;
}

function CheckboxGroupItemInner<TValue>(props: CheckboxGroupItemProps<TValue>) {
  const ctx = useContext(CheckboxGroupContext);
  if (!ctx) throw new Error("CheckboxGroup.Item은 CheckboxGroup 내부에서만 사용할 수 있습니다");

  const isSelected = () => ctx.value().includes(props.value);

  return (
    <Checkbox
      value={isSelected()}
      onValueChange={() => ctx.toggle(props.value)}
      disabled={props.disabled ?? ctx.disabled()}
      size={ctx.size()}
      inline={ctx.inline()}
      inset={ctx.inset()}
    >
      {props.children}
    </Checkbox>
  );
}

// --- CheckboxGroup ---

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

interface CheckboxGroupComponent {
  <TValue = unknown>(props: CheckboxGroupProps<TValue>): JSX.Element;
  Item: typeof CheckboxGroupItemInner;
}

const CheckboxGroupInner: ParentComponent<CheckboxGroupProps<unknown>> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "size",
    "inline",
    "inset",
    "required",
    "validate",
    "touchMode",
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
    inline: () => local.inline ?? false,
    inset: () => local.inset ?? false,
  };

  const errorMsg = createMemo(() => {
    const v = local.value ?? [];
    if (local.required && v.length === 0) return "항목을 선택해 주세요";
    return local.validate?.(v);
  });

  return (
    <Invalid message={errorMsg()} variant="dot" touchMode={local.touchMode}>
      <CheckboxGroupContext.Provider value={contextValue}>
        <div {...rest} class={twMerge("inline-flex", local.class)} style={local.style}>
          {local.children}
        </div>
      </CheckboxGroupContext.Provider>
    </Invalid>
  );
};

export const CheckboxGroup = CheckboxGroupInner as unknown as CheckboxGroupComponent;
CheckboxGroup.Item = CheckboxGroupItemInner;
