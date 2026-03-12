import { type JSX, type ParentComponent, createContext, splitProps, useContext } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../hooks/createControllableSignal";
import { border, text } from "../../styles/base.styles";
import { type ComponentSize, gap, pad } from "../../styles/control.styles";
import { themeTokens } from "../../styles/theme.styles";

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
  if (!ctx) throw new Error("Tabs.Tab can only be used inside Tabs");

  const isSelected = () => ctx.value() === props.value;

  const tabSizeClasses: Record<ComponentSize, string> = {
    md: "px-3 py-1.5 text-sm",
    xs: clsx(pad.sm, "text-xs"),
    sm: "px-2.5 py-1 text-sm",
    lg: "px-4 py-2.5 text-base",
    xl: "px-5 py-3 text-lg",
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected()}
      aria-disabled={props.disabled ?? false}
      tabIndex={props.disabled ? -1 : 0}
      class={twMerge(
        "relative cursor-pointer select-none font-medium transition-colors -mb-px",
        tabSizeClasses[ctx.size() ?? "md"],
        isSelected()
          ? clsx(
              "border-b-2 border-primary-500 dark:border-primary-400",
              themeTokens.primary.text,
            )
          : clsx(
              "border-b-2 border-transparent",
              text.muted,
              "hover:border-base-300 hover:text-base-700",
              "dark:hover:border-base-600 dark:hover:text-base-200",
            ),
        props.disabled && "opacity-50 pointer-events-none",
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

  return (
    <TabsContext.Provider value={contextValue}>
      <div {...rest} role="tablist" class={twMerge(clsx("inline-flex items-center", gap.md, "border-b", border.default), local.class)} style={local.style}>
        {local.children}
      </div>
    </TabsContext.Provider>
  );
};

//#region Export
export const Tabs = Object.assign(TabsInner, {
  Tab: TabsTabInner,
});
//#endregion
