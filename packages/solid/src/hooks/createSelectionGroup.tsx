import {
  type JSX,
  type ParentComponent,
  createMemo,
  splitProps,
  useContext,
} from "solid-js";
import { createHmrSafeContext } from "../helpers/createHmrSafeContext";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "./createControllableSignal";
import { Invalid } from "../components/form-control/Invalid";
import type { CheckboxSize } from "../components/form-control/checkbox/Checkbox.styles";

interface SelectionItemComponentProps {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  children?: JSX.Element;
}

interface SelectionGroupContextBase {
  disabled: () => boolean;
  size: () => CheckboxSize | undefined;
  inline: () => boolean;
  inset: () => boolean;
}

interface MultiSelectContext extends SelectionGroupContextBase {
  value: () => unknown[];
  toggle: (item: unknown) => void;
}

interface SingleSelectContext extends SelectionGroupContextBase {
  value: () => unknown | undefined;
  select: (item: unknown) => void;
}

interface MultiGroupConfig {
  mode: "multiple";
  contextName: string;
  ItemComponent: (props: SelectionItemComponentProps) => JSX.Element;
  emptyErrorMsg: string;
}

interface SingleGroupConfig {
  mode: "single";
  contextName: string;
  ItemComponent: (props: SelectionItemComponentProps) => JSX.Element;
  emptyErrorMsg: string;
}

interface SelectionGroupItemProps<TValue> {
  value: TValue;
  disabled?: boolean;
  children?: JSX.Element;
}

interface MultiGroupProps<TValue> {
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

interface SingleGroupProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue | undefined) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export function createSelectionGroup(config: MultiGroupConfig): {
  Group: {
    <TValue = unknown>(props: MultiGroupProps<TValue>): JSX.Element;
    Item: <TValue = unknown>(props: SelectionGroupItemProps<TValue>) => JSX.Element;
  };
};
export function createSelectionGroup(config: SingleGroupConfig): {
  Group: {
    <TValue = unknown>(props: SingleGroupProps<TValue>): JSX.Element;
    Item: <TValue = unknown>(props: SelectionGroupItemProps<TValue>) => JSX.Element;
  };
};
export function createSelectionGroup(config: MultiGroupConfig | SingleGroupConfig): {
  Group: {
    <TValue = unknown>(props: MultiGroupProps<TValue> | SingleGroupProps<TValue>): JSX.Element;
    Item: <TValue = unknown>(props: SelectionGroupItemProps<TValue>) => JSX.Element;
  };
} {
  const Context = createHmrSafeContext<MultiSelectContext | SingleSelectContext>(
    `SelectionGroup_${config.contextName}`,
  );
  const ItemComponent = config.ItemComponent;

  function ItemInner<TValue>(props: SelectionGroupItemProps<TValue>) {
    const ctx = useContext(Context);
    if (!ctx)
      throw new Error(
        `${config.contextName}.Item can only be used inside ${config.contextName}`,
      );

    const isSelected = (): boolean => {
      if (config.mode === "multiple") {
        return (ctx as MultiSelectContext).value().includes(props.value);
      }
      return (ctx as SingleSelectContext).value() === props.value;
    };

    const handleChange = () => {
      if (config.mode === "multiple") {
        (ctx as MultiSelectContext).toggle(props.value);
      } else {
        (ctx as SingleSelectContext).select(props.value);
      }
    };

    return (
      <ItemComponent
        value={isSelected()}
        onValueChange={handleChange}
        disabled={props.disabled ?? ctx.disabled()}
        size={ctx.size()}
        inline={ctx.inline()}
        inset={ctx.inset()}
      >
        {props.children}
      </ItemComponent>
    );
  }

  const GroupInner: ParentComponent<MultiGroupProps<unknown>> = (props) => {
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

    let contextValue: MultiSelectContext | SingleSelectContext;

    if (config.mode === "multiple") {
      const [value, setValue] = createControllableSignal<unknown[]>({
        value: () => local.value ?? [],
        onChange: () => local.onValueChange as ((v: unknown[]) => void) | undefined,
      });
      const toggle = (item: unknown) => {
        setValue((prev) => {
          if (prev.includes(item)) return prev.filter((v) => v !== item);
          return [...prev, item];
        });
      };
      contextValue = {
        value,
        toggle,
        disabled: () => local.disabled ?? false,
        size: () => local.size,
        inline: () => local.inline ?? false,
        inset: () => local.inset ?? false,
      };
    } else {
      const [value, setValue] = createControllableSignal<unknown>({
        value: () => local.value as unknown | undefined,
        onChange: () => local.onValueChange as ((v: unknown) => void) | undefined,
      });
      const select = (item: unknown) => {
        setValue(item);
      };
      contextValue = {
        value,
        select,
        disabled: () => local.disabled ?? false,
        size: () => local.size,
        inline: () => local.inline ?? false,
        inset: () => local.inset ?? false,
      };
    }

    const errorMsg = createMemo(() => {
      if (config.mode === "multiple") {
        const v = local.value ?? [];
        if (local.required && v.length === 0) return config.emptyErrorMsg;
        return (local.validate as ((v: unknown[]) => string | undefined) | undefined)?.(v);
      } else {
        const v = local.value as unknown | undefined;
        if (local.required && (v === undefined || v === null)) return config.emptyErrorMsg;
        return (local.validate as ((v: unknown | undefined) => string | undefined) | undefined)?.(
          v,
        );
      }
    });

    return (
      <Invalid message={errorMsg()} variant="dot" touchMode={local.touchMode}>
        <Context.Provider value={contextValue}>
          <div {...rest} class={twMerge("inline-flex", local.class)} style={local.style}>
            {local.children}
          </div>
        </Context.Provider>
      </Invalid>
    );
  };

  const Group = GroupInner as unknown as {
    <TValue = unknown>(props: MultiGroupProps<TValue> | SingleGroupProps<TValue>): JSX.Element;
    Item: <TValue = unknown>(props: SelectionGroupItemProps<TValue>) => JSX.Element;
  };
  Group.Item = ItemInner;

  return { Group };
}
