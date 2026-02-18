import { type JSX, type ParentComponent, createContext, splitProps, useContext } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../hooks/createControllableSignal";
import { type ComponentSize } from "../../styles/tokens.styles";

// --- Context ---

interface TabsContextValue {
  value: () => string | undefined;
  select: (value: string) => void;
  size: () => ComponentSize | undefined;
}

const TabsContext = createContext<TabsContextValue>();

// --- Tabs.Tab ---

interface TabsTabProps {
  value: string;
  disabled?: boolean;
  class?: string;
  children?: JSX.Element;
}

function TabsTabInner(props: TabsTabProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.Tab은 Tabs 내부에서만 사용할 수 있습니다");

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

// --- Tabs ---

interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  size?: ComponentSize;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

interface TabsComponent {
  (props: TabsProps): JSX.Element;
  Tab: typeof TabsTabInner;
}

const TabsInner: ParentComponent<TabsProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "size",
    "class",
    "style",
    "children",
  ]);

  const [value, setValue] = createControllableSignal<string | undefined>({
    value: () => local.value,
    onChange: () => local.onValueChange as ((value: string | undefined) => void) | undefined,
  });

  const contextValue: TabsContextValue = {
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
    <TabsContext.Provider value={contextValue}>
      <div {...rest} role="tablist" class={twMerge(baseClass, local.class)} style={local.style}>
        {local.children}
      </div>
    </TabsContext.Provider>
  );
};

export const Tabs = TabsInner as unknown as TabsComponent;
Tabs.Tab = TabsTabInner;
