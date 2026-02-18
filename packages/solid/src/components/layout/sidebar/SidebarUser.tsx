import { type Component, createSignal, For, type JSX, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { IconProps as TablerIconProps } from "@tabler/icons-solidjs";
import { IconUser } from "@tabler/icons-solidjs";
import { ripple } from "../../../directives/ripple";
import { Collapse } from "../../disclosure/Collapse";
import { List } from "../../data/list/List";
import { ListItem } from "../../data/list/ListItem";
import { Icon } from "../../display/Icon";

void ripple;

const containerClass = clsx("m-2 flex flex-col overflow-hidden rounded bg-white dark:bg-base-900");

const headerClass = clsx(
  "flex",
  "items-center",
  "p-2",
  "m-1",
  "rounded-md",
  "text-left",
  "cursor-pointer",
  "transition-colors",
  "hover:bg-base-500/10",
  "dark:hover:bg-base-800",
);

const headerReadonlyClass = clsx("cursor-default hover:bg-transparent dark:hover:bg-transparent");

const avatarClass = clsx(
  "flex size-10 items-center justify-center rounded-full",
  "bg-primary-500 text-white",
);

export interface SidebarUserMenu {
  title: string;
  onClick: () => void;
}

export interface SidebarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  /**
   * 사용자 이름 (필수)
   */
  name: string;

  /**
   * 아바타 아이콘 (미입력 시 기본 사용자 아이콘)
   */
  icon?: Component<TablerIconProps>;

  /**
   * 부가 정보 (이메일 등, 미입력 시 이름만 표시)
   */
  description?: string;

  /**
   * 드롭다운 메뉴 (있을 때만 클릭 가능)
   */
  menus?: SidebarUserMenu[];
}

/**
 * 사이드바 사용자 정보 컴포넌트
 *
 * @remarks
 * - name, icon, description props로 사용자 정보 표시
 * - icon 미입력 시 기본 사용자 아이콘 표시
 * - description 미입력 시 이름만 세로 중앙 정렬
 * - menus가 있을 때만 클릭 가능 및 ripple 효과 적용
 * - 클릭 시 드롭다운 메뉴 펼침/접힘
 *
 * @example
 * ```tsx
 * <SidebarUser
 *   name="홍길동"
 *   description="hong@example.com"
 *   menus={[
 *     { title: "프로필", onClick: () => navigate("/profile") },
 *     { title: "로그아웃", onClick: handleLogout },
 *   ]}
 * />
 * ```
 */
export const SidebarUser: Component<SidebarUserProps> = (props) => {
  const [local, rest] = splitProps(props, ["name", "icon", "description", "class", "menus"]);

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
    <div {...rest} data-sidebar-user class={getContainerClassName()}>
      <button
        type="button"
        use:ripple={hasMenus()}
        class={getHeaderClassName()}
        onClick={handleClick}
        aria-expanded={hasMenus() ? open() : undefined}
      >
        <div class="relative flex flex-1 items-center gap-3">
          <div class={avatarClass}>
            <Icon icon={local.icon ?? IconUser} class="size-6" />
          </div>
          <Show when={local.description} fallback={<span class="font-bold">{local.name}</span>}>
            <div class="flex flex-col">
              <span class="font-bold">{local.name}</span>
              <span class={clsx("text-sm", "text-base-500 dark:text-base-400")}>
                {local.description}
              </span>
            </div>
          </Show>
        </div>
      </button>
      <Show when={hasMenus()}>
        <Collapse open={open()}>
          <hr class={clsx("border-base-100 dark:border-base-800")} />
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
