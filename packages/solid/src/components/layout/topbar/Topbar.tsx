import { type JSX, type ParentComponent, splitProps, Show } from "solid-js";
import { IconMenu2 } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { Icon } from "../../display/Icon";
import { twMerge } from "tailwind-merge";
import { Button } from "../../form-control/Button";
import { useSidebarContextOptional } from "../sidebar/SidebarContext";
import { TopbarActions } from "./TopbarActions";
import { TopbarContainer } from "./TopbarContainer";
import { TopbarMenu } from "./TopbarMenu";
import { TopbarUser } from "./TopbarUser";

export type { TopbarContainerProps } from "./TopbarContainer";
export type { TopbarMenuItem, TopbarMenuProps } from "./TopbarMenu";
export type { TopbarUserMenu, TopbarUserProps } from "./TopbarUser";

const baseClass = clsx(
  // 레이아웃
  "flex",
  "flex-row",
  "gap-2",
  "items-center",
  // 크기
  "min-h-12",
  "px-2",
  // 배경/테두리
  "bg-white",
  "dark:bg-base-900",
  "border-b",
  "border-base-200",
  "dark:border-base-700",
  // 스크롤
  "overflow-x-auto",
  "overflow-y-hidden",
  // 기타
  "select-none",
);

export interface TopbarProps extends JSX.HTMLAttributes<HTMLElement> {
  children: JSX.Element;
}

/**
 * 상단바 본체 컴포넌트
 *
 * @remarks
 * - SidebarContext가 있을 경우 사이드바 토글 버튼 자동 표시
 * - SidebarContainer 내부에서 사용하면 토글 버튼이 나타남
 * - 단독 사용 시 토글 버튼 없이 순수 Topbar로 동작
 *
 * @example
 * ```tsx
 * <Topbar>
 *   <h1 class="text-lg font-bold">앱 이름</h1>
 *   <Topbar.Menu menus={menuItems} />
 *   <div class="flex-1" />
 *   <Topbar.User menus={userMenus}>사용자</Topbar.User>
 * </Topbar>
 * ```
 */
interface TopbarComponent extends ParentComponent<TopbarProps> {
  Actions: typeof TopbarActions;
  Container: typeof TopbarContainer;
  Menu: typeof TopbarMenu;
  User: typeof TopbarUser;
}

const TopbarBase: ParentComponent<TopbarProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  // SidebarContext 선택적 사용 (Context 없으면 토글 버튼 미표시)
  const sidebarContext = useSidebarContextOptional();

  const handleToggle = () => {
    sidebarContext?.setToggle((v) => !v);
  };

  const getClassName = () => twMerge(baseClass, local.class);

  return (
    <header {...rest} data-topbar class={getClassName()}>
      <Show when={sidebarContext}>
        <Button variant="ghost" onClick={handleToggle} class="p-2" aria-label="사이드바 토글">
          <Icon icon={IconMenu2} size="1.5em" />
        </Button>
      </Show>
      {local.children}
    </header>
  );
};

export const Topbar = TopbarBase as TopbarComponent;
Topbar.Actions = TopbarActions;
Topbar.Container = TopbarContainer;
Topbar.Menu = TopbarMenu;
Topbar.User = TopbarUser;
