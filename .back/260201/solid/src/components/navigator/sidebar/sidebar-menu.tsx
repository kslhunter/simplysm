import "@simplysm/core-common";
import { type Component, createMemo, For, type JSX, Show, splitProps } from "solid-js";
import type { IconProps } from "@tabler/icons-solidjs";
import { useLocation, useNavigate } from "@solidjs/router";
import { sidebarMenu, sidebarMenuHeader, sidebarMenuList } from "./sidebar-menu.css";
import { List } from "../../data/list/list";
import { ListItem } from "../../data/list/list-item";
import { useSidebar } from "./sidebar-context";
import { MOBILE_BREAKPOINT_PX } from "../../../constants";
import { atoms } from "../../../styles/atoms.css";
import { buildHref } from "../../../utils/build-href";

/**
 * 사이드바 메뉴 아이템 타입
 *
 * @property title - 메뉴 표시 이름
 * @property path - 라우터 경로 또는 외부 URL (://포함 시 새 탭에서 열림)
 * @property icon - 메뉴 아이콘 컴포넌트 (@tabler/icons-solidjs)
 * @property children - 하위 메뉴 목록
 */
export interface SidebarMenuItem {
  title: string;
  path?: string;
  icon?: Component<IconProps>;
  children?: SidebarMenuItem[];
}

/**
 * SidebarMenu 컴포넌트의 props
 *
 * @property menus - 메뉴 아이템 목록
 * @property layout - 메뉴 레이아웃 (accordion: 아코디언, flat: 항상 펼침).
 *                    생략 시 메뉴 개수에 따라 자동 선택 (3개 이하: flat, 4개 이상: accordion)
 */
export interface SidebarMenuProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  menus: SidebarMenuItem[];
  layout?: "accordion" | "flat";
}

/**
 * 사이드바 메뉴 컴포넌트
 *
 * Sidebar 내부에서 네비게이션 메뉴를 표시한다.
 * 메뉴 선택은 현재 라우터 경로(`location.pathname`)와 메뉴의 `path`를 비교하여 자동으로 결정된다.
 *
 * @example
 * ```tsx
 * <SidebarMenu
 *   menus={[
 *     { title: "홈", path: "/", icon: IconHome },
 *     { title: "설정", children: [
 *       { title: "프로필", path: "/settings/profile" },
 *     ]},
 *   ]}
 * />
 * ```
 */
export const SidebarMenu: Component<SidebarMenuProps> = (props) => {
  const [local, rest] = splitProps(props, ["menus", "layout"]);
  const effectiveLayout = createMemo(() => {
    if (local.layout !== undefined) return local.layout;
    return local.menus.length <= 3 ? "flat" : "accordion";
  });

  const { setToggled } = useSidebar();

  // 네비게이션 함수
  const navigate = useNavigate();

  // 메뉴 클릭 핸들러
  const handleMenuClick = (menu: SidebarMenuItem, event: MouseEvent) => {
    if (menu.path == null) return;

    // 외부 URL은 새 탭에서 열기
    if (menu.path.includes("://")) {
      window.open(menu.path, "_blank");
      return;
    }

    // Ctrl/Alt 키: 새 탭으로 열기 (사이드바 유지)
    if (event.ctrlKey || event.altKey) {
      window.open(buildHref(menu.path), "_blank");
      return;
    }
    // Shift 키: 새 창으로 열기 (사이드바 유지)
    if (event.shiftKey) {
      window.open(buildHref(menu.path), "_blank", "width=800,height=800");
      return;
    }
    // 일반 클릭: SPA 네비게이션
    navigate(menu.path);

    // 모바일에서 사이드바 숨기기 (toggled=false → 모바일: 숨김)
    if (window.innerWidth <= MOBILE_BREAKPOINT_PX) {
      setToggled(false);
    }
  };

  return (
    <nav {...rest} class={[sidebarMenu, rest.class].filter(Boolean).join(" ")}>
      <div class={sidebarMenuHeader}>MENU</div>
      <List inset class={sidebarMenuList}>
        <For each={local.menus}>
          {(menu) => (
            <MenuItemRenderer
              menu={menu}
              depth={0}
              layout={effectiveLayout()}
              onMenuClick={handleMenuClick}
            />
          )}
        </For>
      </List>
    </nav>
  );
};

interface MenuItemRendererProps {
  menu: SidebarMenuItem;
  depth: number;
  layout: "accordion" | "flat";
  parentLayout?: "accordion" | "flat";
  onMenuClick: (menu: SidebarMenuItem, event: MouseEvent) => void;
}

/**
 * 재귀적으로 메뉴 아이템을 렌더링하는 내부 컴포넌트
 */
const MenuItemRenderer: Component<MenuItemRendererProps> = (props) => {
  const location = useLocation();

  const hasChildren = () => (props.menu.children?.length ?? 0) > 0;

  return (
    <ListItem
      layout={props.layout}
      selected={location.pathname === props.menu.path}
      style={{
        "text-indent": `${props.parentLayout === "accordion" && props.depth !== 0 ? (props.depth + 1) * 0.5 : 0}rem`,
      }}
      class={atoms({ gap: "xs" })}
      onClick={(event) => props.onMenuClick(props.menu, event)}
    >
      <Show when={props.menu.icon} keyed>
        {(icon) => icon({})}
      </Show>
      <div>{props.menu.title}</div>
      <Show when={hasChildren()}>
        <List inset>
          <For each={props.menu.children}>
            {(child) => (
              <MenuItemRenderer
                menu={child}
                depth={props.depth + 1}
                layout="accordion"
                parentLayout={props.layout}
                onMenuClick={props.onMenuClick}
              />
            )}
          </For>
        </List>
      </Show>
    </ListItem>
  );
};
