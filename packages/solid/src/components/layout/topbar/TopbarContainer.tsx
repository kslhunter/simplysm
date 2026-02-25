import { type JSX, type ParentComponent, splitProps, createSignal } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { TopbarContext } from "./TopbarContext";

const containerClass = clsx("flex h-full flex-col");

export interface TopbarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

/**
 * Layout container wrapping Topbar and content area
 *
 * @remarks
 * - Uses `flex flex-col h-full` structure to vertically layout Topbar and content
 * - Shares actions state via TopbarContext.Provider
 * - Parent element must have height specified
 *
 * @example
 * ```tsx
 * <TopbarContainer>
 *   <Topbar>
 *     <h1>App Name</h1>
 *     <TopbarMenu menus={menuItems} />
 *   </Topbar>
 *   <main class="flex-1 overflow-auto">Content</main>
 * </TopbarContainer>
 * ```
 */
export const TopbarContainer: ParentComponent<TopbarContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  const [actions, setActions] = createSignal<JSX.Element | undefined>(undefined);

  const getClassName = () => twMerge(containerClass, local.class);

  return (
    <TopbarContext.Provider value={{ actions, setActions }}>
      <div {...rest} data-topbar-container class={getClassName()}>
        {local.children}
      </div>
    </TopbarContext.Provider>
  );
};
