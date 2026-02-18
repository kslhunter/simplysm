import {
  type Component,
  type JSX,
  For,
  Show,
  splitProps,
  createSignal,
  createMemo,
} from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import { IconChevronDown, IconDotsVertical, type IconProps } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "../../form-control/Button";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { ListItem } from "../../data/list/ListItem";

const desktopNavBaseClass = clsx("hidden sm:flex", "flex-row gap-1", "items-center");
const mobileWrapperClass = clsx("flex sm:hidden");
const menuButtonContentClass = clsx("flex items-center", "gap-1");

export interface TopbarMenuItem {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: TopbarMenuItem[];
}

export interface TopbarMenuProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  /**
   * 메뉴 아이템 배열
   */
  menus: TopbarMenuItem[];
}

/**
 * Topbar 드롭다운 메뉴 컴포넌트
 *
 * @remarks
 * - children이 있는 항목: 클릭 시 드롭다운 표시
 * - children이 없는 항목: 클릭 시 바로 네비게이션
 * - 외부 링크(://포함)는 새 탭에서 열기
 * - pathname 정확 일치로 선택 상태 판단
 * - 하위 메뉴는 List/ListItem으로 렌더링 (모든 계층 펼침)
 *
 * @example
 * ```tsx
 * <TopbarMenu menus={[
 *   { title: "대시보드", href: "/dashboard", icon: IconHome },
 *   {
 *     title: "메뉴1",
 *     icon: IconFolder,
 *     children: [
 *       { title: "서브메뉴1", href: "/menu1/sub1" },
 *       { title: "서브메뉴2", href: "/menu1/sub2" },
 *     ],
 *   },
 * ]} />
 * ```
 */
export const TopbarMenu: Component<TopbarMenuProps> = (props) => {
  const [local, rest] = splitProps(props, ["menus", "class"]);
  const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
  let mobileButtonRef: HTMLButtonElement | undefined;

  return (
    <>
      {/* 데스크탑 메뉴 (640px 이상에서만 표시) */}
      <nav {...rest} data-topbar-menu class={twMerge(desktopNavBaseClass, local.class)}>
        <For each={local.menus}>{(menu) => <TopbarMenuButton menu={menu} />}</For>
      </nav>

      {/* 모바일 햄버거 (640px 미만에서만 표시) */}
      <div class={mobileWrapperClass}>
        <Button
          ref={mobileButtonRef}
          variant="ghost"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="메뉴"
          aria-haspopup="menu"
          aria-expanded={mobileMenuOpen()}
        >
          <Icon icon={IconDotsVertical} size="1.25em" />
        </Button>
        <Dropdown
          triggerRef={() => mobileButtonRef}
          open={mobileMenuOpen()}
          onOpenChange={setMobileMenuOpen}
        >
          <List inset>
            <For each={local.menus}>
              {(menu) => (
                <TopbarMenuDropdownItem menu={menu} onClose={() => setMobileMenuOpen(false)} />
              )}
            </For>
          </List>
        </Dropdown>
      </div>
    </>
  );
};

interface TopbarMenuButtonProps {
  menu: TopbarMenuItem;
}

const TopbarMenuButton: Component<TopbarMenuButtonProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = createSignal(false);
  let buttonRef: HTMLButtonElement | undefined;

  const hasChildren = () => props.menu.children !== undefined && props.menu.children.length > 0;
  const isExternalLink = () => props.menu.href?.includes("://") ?? false;

  const isAnyChildSelected = (items: TopbarMenuItem[]): boolean => {
    for (const item of items) {
      if (item.href === location.pathname) return true;
      if (item.children && isAnyChildSelected(item.children)) return true;
    }
    return false;
  };

  // 현재 메뉴 또는 하위 메뉴가 선택되었는지 확인 (createMemo로 캐싱)
  const isSelected = createMemo(() => {
    if (props.menu.href === location.pathname) return true;
    if (props.menu.children) {
      return isAnyChildSelected(props.menu.children);
    }
    return false;
  });

  const handleClick = () => {
    if (hasChildren()) {
      setOpen((v) => !v);
    } else if (props.menu.href !== undefined) {
      if (isExternalLink()) {
        window.open(props.menu.href, "_blank", "noopener,noreferrer");
      } else {
        navigate(props.menu.href);
      }
    }
  };

  return (
    <>
      <Button
        ref={buttonRef}
        variant={isSelected() ? "solid" : "ghost"}
        theme={isSelected() ? "primary" : "base"}
        onClick={handleClick}
        class={menuButtonContentClass}
        aria-haspopup={hasChildren() ? "menu" : undefined}
        aria-expanded={hasChildren() ? open() : undefined}
      >
        <Show when={props.menu.icon}>
          <Icon icon={props.menu.icon!} />
        </Show>
        <span>{props.menu.title}</span>
        <Show when={hasChildren()}>
          <Icon
            icon={IconChevronDown}
            size="1em"
            class={clsx("transition-transform", open() && "rotate-180")}
          />
        </Show>
      </Button>
      <Show when={hasChildren()}>
        <Dropdown triggerRef={() => buttonRef} open={open()} onOpenChange={setOpen}>
          <List inset>
            <For each={props.menu.children}>
              {(child) => <TopbarMenuDropdownItem menu={child} onClose={() => setOpen(false)} />}
            </For>
          </List>
        </Dropdown>
      </Show>
    </>
  );
};

interface TopbarMenuDropdownItemProps {
  menu: TopbarMenuItem;
  onClose: () => void;
}

const TopbarMenuDropdownItem: Component<TopbarMenuDropdownItemProps> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

  const hasChildren = () => props.menu.children !== undefined && props.menu.children.length > 0;
  const isExternalLink = () => props.menu.href?.includes("://") ?? false;
  const isSelected = () => props.menu.href === location.pathname;

  const handleClick = () => {
    if (props.menu.href !== undefined) {
      if (isExternalLink()) {
        window.open(props.menu.href, "_blank", "noopener,noreferrer");
      } else {
        navigate(props.menu.href);
      }
      props.onClose();
    }
    // href가 없고 children만 있는 경우 클릭해도 닫히지 않음
  };

  return (
    <ListItem
      selected={isSelected()}
      readonly={props.menu.href === undefined && hasChildren()}
      onClick={handleClick}
    >
      <Show when={props.menu.icon}>
        <Icon icon={props.menu.icon!} />
      </Show>
      <span class="truncate">{props.menu.title}</span>
      <Show when={hasChildren()}>
        <ListItem.Children>
          <For each={props.menu.children}>
            {(child) => <TopbarMenuDropdownItem menu={child} onClose={props.onClose} />}
          </For>
        </ListItem.Children>
      </Show>
    </ListItem>
  );
};
