import "@simplysm/core-common";
import { type Component, createSignal, For, type JSX, Show, splitProps } from "solid-js";
import type { IconProps } from "@tabler/icons-solidjs";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { useLocation, useNavigate } from "@solidjs/router";
import { topbarMenu, topbarMenuNestedList } from "./topbar-menu.css";
import { Dropdown } from "../../overlay/dropdown/dropdown";
import { DropdownPopup } from "../../overlay/dropdown/dropdown-popup";
import { useDropdown } from "../../overlay/dropdown/dropdown-context";
import { Button } from "../../controls/button/button";
import { List } from "../../data/list/list";
import { ListItem } from "../../data/list/list-item";
import { atoms } from "../../../styles/atoms.css";
import { buildHref } from "../../../utils/build-href";

/**
 * 메뉴 아이템 타입
 *
 * @property title - 메뉴 표시 이름
 * @property path - 라우터 경로 (없으면 클릭 불가)
 * @property url - 외부 URL (새 탭에서 열림)
 * @property icon - 메뉴 아이콘 컴포넌트
 * @property children - 중첩 메뉴
 */
export interface TopbarMenuItem {
  title: string;
  path?: string;
  url?: string;
  icon?: Component<IconProps>;
  children?: TopbarMenuItem[];
}

/**
 * TopbarMenu 컴포넌트의 props
 *
 * @property menus - 1단계 메뉴 배열 (각 메뉴가 드롭다운 트리거)
 * @property isSelectedFn - 메뉴 선택 상태 판별 함수 (기본값: 현재 경로와 path 비교)
 */
export interface TopbarMenuProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  menus: TopbarMenuItem[];
  isSelectedFn?: (menu: TopbarMenuItem) => boolean;
}

/**
 * 탑바 드롭다운 메뉴 컴포넌트
 *
 * 1단계 메뉴는 상단바에 버튼으로 표시되고,
 * 각 버튼을 클릭하면 드롭다운으로 하위 메뉴가 표시된다.
 * 무제한 중첩을 지원한다.
 *
 * @example
 * ```tsx
 * const menus: TopbarMenuItem[] = [
 *   {
 *     title: "관리",
 *     children: [
 *       { title: "사용자 관리", path: "/admin/users" },
 *       { title: "설정", path: "/admin/settings" },
 *     ],
 *   },
 * ];
 *
 * <TopbarMenu menus={menus} />
 * ```
 */
export const TopbarMenu: Component<TopbarMenuProps> = (props) => {
  const [local, rest] = splitProps(props, ["menus", "isSelectedFn", "class"]);

  const location = useLocation();
  const navigate = useNavigate();

  const isSelected = (menu: TopbarMenuItem): boolean => {
    if (local.isSelectedFn) return local.isSelectedFn(menu);
    return menu.path != null && location.pathname === menu.path;
  };

  const handleMenuClick = (menu: TopbarMenuItem, event: MouseEvent, closeDropdown: () => void) => {
    // 외부 URL
    if (menu.url != null) {
      window.open(menu.url, "_blank");
      closeDropdown();
      return;
    }

    // 내부 경로
    if (menu.path != null) {
      if (event.ctrlKey || event.altKey) {
        window.open(buildHref(menu.path), "_blank");
      } else if (event.shiftKey) {
        window.open(buildHref(menu.path), "_blank", "width=800,height=800");
      } else {
        navigate(menu.path);
      }
      closeDropdown();
    }
  };

  return (
    <nav {...rest} class={[topbarMenu, local.class].filter(Boolean).join(" ")}>
      <For each={local.menus}>
        {(menu) => (
          <TopbarMenuDropdown menu={menu} isSelected={isSelected} onMenuClick={handleMenuClick} />
        )}
      </For>
    </nav>
  );
};

/**
 * 개별 드롭다운 메뉴 (자체 open 상태 관리)
 */
const TopbarMenuDropdown: Component<{
  menu: TopbarMenuItem;
  isSelected: (menu: TopbarMenuItem) => boolean;
  onMenuClick: (menu: TopbarMenuItem, event: MouseEvent, closeDropdown: () => void) => void;
}> = (props) => {
  const [open, setOpen] = createSignal(false);

  return (
    <Dropdown open={open()} onOpenChange={setOpen}>
      <TopbarMenuTrigger menu={props.menu} />
      <TopbarMenuPopup
        menus={props.menu.children ?? []}
        isSelected={props.isSelected}
        onMenuClick={props.onMenuClick}
      />
    </Dropdown>
  );
};

/**
 * 드롭다운 트리거 버튼 (1단계 메뉴)
 */
const TopbarMenuTrigger: Component<{ menu: TopbarMenuItem }> = (props) => {
  return (
    <Button link>
      <Show when={props.menu.icon}>{(icon) => icon()({ size: 18 })}</Show>
      {props.menu.title}
      <IconChevronDown size={16} />
    </Button>
  );
};

/**
 * 드롭다운 팝업 내용 (useDropdown으로 close 함수 접근)
 */
const TopbarMenuPopup: Component<{
  menus: TopbarMenuItem[];
  isSelected: (menu: TopbarMenuItem) => boolean;
  onMenuClick: (menu: TopbarMenuItem, event: MouseEvent, closeDropdown: () => void) => void;
}> = (props) => {
  const dropdown = useDropdown();

  return (
    <DropdownPopup>
      <List inset>
        <MenuItemRenderer
          menus={props.menus}
          depth={0}
          isSelected={props.isSelected}
          onMenuClick={props.onMenuClick}
          closeDropdown={() => dropdown?.close()}
        />
      </List>
    </DropdownPopup>
  );
};

interface MenuItemRendererProps {
  menus: TopbarMenuItem[];
  depth: number;
  isSelected: (menu: TopbarMenuItem) => boolean;
  onMenuClick: (menu: TopbarMenuItem, event: MouseEvent, closeDropdown: () => void) => void;
  closeDropdown: () => void;
}

/**
 * 재귀적으로 메뉴 아이템을 렌더링하는 내부 컴포넌트
 */
const MenuItemRenderer: Component<MenuItemRendererProps> = (props) => {
  return (
    <For each={props.menus}>
      {(menu) => (
        <ListItem
          layout="flat"
          selected={props.isSelected(menu)}
          style={{ "text-indent": `${props.depth > 0 ? (props.depth + 1) * 0.5 : 0}rem` }}
          class={atoms({ gap: "xs" })}
          onClick={(e) => props.onMenuClick(menu, e, props.closeDropdown)}
        >
          <Show when={menu.icon}>{(icon) => icon()({ size: 16 })}</Show>
          <span>{menu.title}</span>
          <Show when={menu.children?.length}>
            <List inset class={topbarMenuNestedList}>
              <MenuItemRenderer
                menus={menu.children!}
                depth={props.depth + 1}
                isSelected={props.isSelected}
                onMenuClick={props.onMenuClick}
                closeDropdown={props.closeDropdown}
              />
            </List>
          </Show>
        </ListItem>
      )}
    </For>
  );
};
