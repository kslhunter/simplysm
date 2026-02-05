import { createSignal, For, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ripple } from "../../../directives/ripple";
import { Collapse } from "../../disclosure/Collapse";
import { List } from "../../data/list/List";
import { ListItem } from "../../data/list/ListItem";

void ripple;

const containerClass = clsx`m-2 flex flex-col overflow-hidden rounded bg-white dark:bg-slate-700/50`;

const headerClass = clsx(
  "flex",
  "items-center",
  "p-2",
  "text-left",
  "cursor-pointer",
  "transition-colors",
  "hover:bg-slate-500/10",
  "dark:hover:bg-slate-600/50",
);

const headerReadonlyClass = clsx`cursor-default hover:bg-transparent dark:hover:bg-transparent`;

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

  const getHeaderClassName = () => twMerge(headerClass, !hasMenus() && headerReadonlyClass, open() && "border-b border-b-slate-50");

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
