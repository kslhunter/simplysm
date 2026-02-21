import { type JSX, type ParentComponent, splitProps, createSignal } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { TopbarContext } from "./TopbarContext";

const containerClass = clsx("flex h-full flex-col");

export interface TopbarContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

/**
 * Topbar + 콘텐츠 영역을 감싸는 레이아웃 컨테이너
 *
 * @remarks
 * - `flex flex-col h-full` 구조로 Topbar와 콘텐츠를 수직 배치
 * - TopbarContext.Provider로 actions 상태 공유
 * - 부모 요소에 높이가 지정되어야 함
 *
 * @example
 * ```tsx
 * <TopbarContainer>
 *   <Topbar>
 *     <h1>앱 이름</h1>
 *     <TopbarMenu menus={menuItems} />
 *   </Topbar>
 *   <main class="flex-1 overflow-auto">콘텐츠</main>
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
