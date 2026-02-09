import { type JSX, type ParentComponent, createContext, splitProps, useContext } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../utils/createPropSignal";

// --- Context ---

interface TabContextValue {
  value: () => string | undefined;
  select: (value: string) => void;
  size: () => "sm" | "lg" | undefined;
}

const TabContext = createContext<TabContextValue>();

// --- Tab.Item ---

interface TabItemProps {
  value: string;
  disabled?: boolean;
  class?: string;
  children?: JSX.Element;
}

function TabItemInner(props: TabItemProps) {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("Tab.Item must be used inside Tab");

  const isSelected = () => ctx.value() === props.value;

  const sizeClasses = () => {
    switch (ctx.size()) {
      case "sm":
        return "px-2.5 py-1 text-sm";
      case "lg":
        return "px-4 py-2.5 text-base";
      default:
        return "px-3 py-1.5 text-sm";
    }
  };

  const baseClass = clsx(
    "relative cursor-pointer select-none font-medium",
    "transition-colors",
    "-mb-px",
  );

  const stateClass = () =>
    isSelected()
      ? clsx(
          "border-b-2 border-primary-500 text-primary-600",
          "dark:border-primary-400 dark:text-primary-400",
        )
      : clsx(
          "border-b-2 border-transparent",
          "text-base-500 hover:border-base-300 hover:text-base-700",
          "dark:text-base-400 dark:hover:border-base-600 dark:hover:text-base-200",
        );

  const disabledClass = "opacity-50 pointer-events-none";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected()}
      aria-disabled={props.disabled ?? false}
      tabIndex={props.disabled ? -1 : 0}
      class={twMerge(
        baseClass,
        sizeClasses(),
        stateClass(),
        props.disabled && disabledClass,
        props.class,
      )}
      onClick={() => {
        if (!props.disabled) {
          ctx.select(props.value);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!props.disabled) {
            ctx.select(props.value);
          }
        }
      }}
    >
      {props.children}
    </button>
  );
}

// --- Tab ---

interface TabProps {
  value?: string;
  onValueChange?: (value: string) => void;
  size?: "sm" | "lg";
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

interface TabComponent {
  (props: TabProps): JSX.Element;
  Item: typeof TabItemInner;
}

const TabInner: ParentComponent<TabProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "size",
    "class",
    "style",
    "children",
  ]);

  const [value, setValue] = createPropSignal<string | undefined>({
    value: () => local.value,
    onChange: () => local.onValueChange as ((value: string | undefined) => void) | undefined,
  });

  const contextValue: TabContextValue = {
    value,
    select: (v: string) => {
      setValue(v);
    },
    size: () => local.size,
  };

  const baseClass = clsx(
    "inline-flex items-center gap-1",
    "border-b border-base-200",
    "dark:border-base-700",
  );

  return (
    <TabContext.Provider value={contextValue}>
      <div
        {...rest}
        role="tablist"
        class={twMerge(baseClass, local.class)}
        style={local.style}
      >
        {local.children}
      </div>
    </TabContext.Provider>
  );
};

export const Tab = TabInner as unknown as TabComponent;
Tab.Item = TabItemInner;
