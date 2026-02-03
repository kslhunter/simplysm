import { type JSX, type ParentComponent, Show, For, splitProps, createSignal } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../directives/ripple";
import { Collapse } from "../disclosure/Collapse";
import { List } from "../data/List";
import { ListItem } from "../data/ListItem";

void ripple;

const containerClass = clsx("flex", "flex-col", "border-b", "border-gray-200", "dark:border-gray-800");

const headerClass = clsx(
  "flex",
  "items-center",
  "p-4",
  "cursor-pointer",
  "transition-colors",
  "hover:bg-gray-500/10",
  "dark:hover:bg-gray-800",
);

const headerReadonlyClass = clsx("cursor-default", "hover:bg-transparent", "dark:hover:bg-transparent");

export interface SidebarUserMenu {
  title: string;
  onClick: () => void;
}

export interface SidebarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  /**
   * 드롭다운 메뉴 (있을 때만 클릭 가능)
   */
  menus?: SidebarUserMenu[];

  /**
   * 사용자 정보 영역 (커스터마이징)
   */
  children: JSX.Element;
}

/**
 * 사이드바 사용자 정보 컴포넌트
 *
 * @remarks
 * - children으로 사용자 정보 영역 커스터마이징
 * - menus가 있을 때만 클릭 가능 및 ripple 효과 적용
 * - 클릭 시 드롭다운 메뉴 펼침/접힘
 *
 * @example
 * ```tsx
 * <SidebarUser menus={[
 *   { title: "프로필", onClick: () => navigate("/profile") },
 *   { title: "로그아웃", onClick: handleLogout },
 * ]}>
 *   <Avatar src={user.avatar} />
 *   <span>{user.name}</span>
 * </SidebarUser>
 * ```
 */
export const SidebarUser: ParentComponent<SidebarUserProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "menus"]);

  const [open, setOpen] = createSignal(false);

  const hasMenus = () => local.menus !== undefined && local.menus.length > 0;

  const handleClick = () => {
    if (hasMenus()) {
      setOpen((v) => !v);
    }
  };

  const handleMenuClick = (menu: SidebarUserMenu) => {
    setOpen(false);
    menu.onClick();
  };

  const getHeaderClassName = () => twMerge(headerClass, !hasMenus() && headerReadonlyClass);

  const getContainerClassName = () => twMerge(containerClass, local.class);

  return (
    <div {...rest} class={getContainerClassName()}>
      <button
        type="button"
        use:ripple={hasMenus()}
        class={getHeaderClassName()}
        onClick={handleClick}
        aria-expanded={hasMenus() ? open() : undefined}
      >
        {local.children}
      </button>
      <Show when={hasMenus()}>
        <Collapse open={open()}>
          <List inset>
            <For each={local.menus}>
              {(menu) => <ListItem onClick={() => handleMenuClick(menu)}>{menu.title}</ListItem>}
            </For>
          </List>
        </Collapse>
      </Show>
    </div>
  );
};
