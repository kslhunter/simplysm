import { type JSX, createMemo, For, mergeProps, Show, splitProps } from "solid-js";
import { twJoin } from "tailwind-merge";
import { useSidebar } from "../contexts/SidebarContext";
import { useMobile } from "../hooks/useMediaQuery";
import { SdList } from "./SdList";
import { SdListItem } from "./SdListItem";
import type { IconComponent } from "../types/icon.types";

export interface SdSidebarMenuItem {
  /** 메뉴 제목 */
  title: string;
  /** 코드 체인 (경로/ID 용도) */
  codeChain: string[];
  /** 외부 URL (새 탭에서 열림) */
  url?: string;
  /** 아이콘 컴포넌트 */
  icon?: IconComponent;
  /** 하위 메뉴 */
  children?: SdSidebarMenuItem[];
}

export interface SdSidebarMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** 메뉴 데이터 */
  menus: SdSidebarMenuItem[];
  /** 루트 레이아웃 (기본: 메뉴 구조에 따라 자동 결정) */
  layout?: "accordion" | "flat";
  /** 메뉴 선택 여부 판별 함수 */
  isMenuSelected?: (menu: SdSidebarMenuItem) => boolean;
  /** 메뉴 클릭 핸들러 */
  onMenuClick?: (menu: SdSidebarMenuItem) => void;
  /** 모바일에서 메뉴 클릭 시 사이드바 자동 닫힘 (기본: true) */
  autoCloseOnMobile?: boolean;
}

interface MenuItemRendererProps {
  menus: SdSidebarMenuItem[];
  depth: number;
  rootLayout: "accordion" | "flat";
  isMenuSelected?: (menu: SdSidebarMenuItem) => boolean;
  onMenuClick?: (menu: SdSidebarMenuItem) => void;
  autoCloseOnMobile: boolean;
}

/**
 * 메뉴 아이템 재귀 렌더러
 */
function MenuItemRenderer(props: MenuItemRendererProps) {
  const isMobile = useMobile();
  const { setCollapsed } = useSidebar();

  const handleMenuClick = (menu: SdSidebarMenuItem) => {
    if (menu.url !== undefined && menu.url !== "") {
      window.open(menu.url, "_blank");
    }
    props.onMenuClick?.(menu);

    // 모바일 + 리프 메뉴 클릭 시 사이드바 닫기
    if (props.autoCloseOnMobile && (menu.children == null || menu.children.length === 0) && isMobile()) {
      setCollapsed(false);
    }
  };

  const isSelected = (menu: SdSidebarMenuItem) => {
    return props.isMenuSelected?.(menu) ?? false;
  };

  return (
    <For each={props.menus}>
      {(menu) => {
        const itemLayout = () => (props.depth === 0 ? props.rootLayout : "accordion");

        const menuChildren = menu.children;
        const menuHasChildren = menuChildren != null && menuChildren.length > 0;

        return (
          <SdListItem
            contentStyle={props.depth !== 0 ? { "text-indent": `${(props.depth + 1) * 0.5}em` } : undefined}
            onClick={() => handleMenuClick(menu)}
            selected={isSelected(menu)}
            layout={itemLayout()}
            hasChildren={menuHasChildren}
            childList={
              menuHasChildren ? (
                <SdList inset>
                  <MenuItemRenderer
                    menus={menuChildren}
                    depth={props.depth + 1}
                    rootLayout={props.rootLayout}
                    isMenuSelected={props.isMenuSelected}
                    onMenuClick={props.onMenuClick}
                    autoCloseOnMobile={props.autoCloseOnMobile}
                  />
                </SdList>
              ) : undefined
            }
          >
            <span class="flex items-center gap-2">
              <Show when={menu.icon}>
                <span class="[&>svg]:block">{menu.icon?.({})}</span>
              </Show>
              <span>{menu.title}</span>
            </span>
          </SdListItem>
        );
      }}
    </For>
  );
}

/**
 * 사이드바 메뉴 컴포넌트
 *
 * @remarks
 * - 계층형 메뉴를 재귀적으로 렌더링한다.
 * - `layout`이 지정되지 않으면 자식 메뉴 유무에 따라 자동 결정:
 *   - 자식 메뉴가 있으면 accordion
 *   - 메뉴 3개 이하면 flat, 초과면 accordion
 * - 외부 URL은 새 탭에서 열린다.
 * - 모바일에서 리프 메뉴 클릭 시 사이드바가 자동으로 닫힌다. (autoCloseOnMobile)
 */
export function SdSidebarMenu(props: SdSidebarMenuProps) {
  const merged = mergeProps({ menus: [], autoCloseOnMobile: true }, props);
  const [local, rest] = splitProps(merged, ["menus", "layout", "isMenuSelected", "onMenuClick", "autoCloseOnMobile", "class"]);

  const rootLayout = createMemo(() => {
    if (local.layout) return local.layout;

    // 자식 메뉴가 있으면 accordion
    const hasChildMenu = local.menus.some((m) => m.children != null && m.children.length > 0);
    if (hasChildMenu) return "accordion";

    return local.menus.length <= 3 ? "flat" : "accordion";
  });

  return (
    <div
      class={twJoin("flex", "flex-col", "flex-1", "min-h-0", local.class)}
      data-sd-root-layout={rootLayout()}
      {...rest}
    >
      {/* 메뉴 헤더 */}
      <div class="px-ctrl py-ctrl-lg text-sm font-semibold text-text-muted">MENU</div>

      {/* 메뉴 리스트 */}
      <SdList inset class="flex-1 overflow-auto">
        <MenuItemRenderer
          menus={local.menus}
          depth={0}
          rootLayout={rootLayout()}
          isMenuSelected={local.isMenuSelected}
          onMenuClick={local.onMenuClick}
          autoCloseOnMobile={local.autoCloseOnMobile}
        />
      </SdList>
    </div>
  );
}
