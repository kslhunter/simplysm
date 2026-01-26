import { type ParentProps, createSignal, For, Show, splitProps } from "solid-js";
import { twJoin } from "tailwind-merge";
import { ripple } from "../directives/ripple";
import { SdCollapse } from "./SdCollapse";
import { SdCollapseIcon } from "./SdCollapseIcon";
import { SdList } from "./SdList";
import { SdListItem } from "./SdListItem";

/**
 * 사이드바 사용자 메뉴 아이템 타입
 */
export interface SdSidebarUserMenuItem {
  /** 메뉴 제목 */
  title: string;
  /** 클릭 핸들러 */
  onClick: () => void;
}

/**
 * 사이드바 사용자 메뉴 설정 타입
 */
export interface SdSidebarUserMenu {
  /** 메뉴 그룹 제목 */
  title: string;
  /** 메뉴 아이템 배열 */
  menus: SdSidebarUserMenuItem[];
}

export interface SdSidebarUserProps extends ParentProps {
  /** 사용자 메뉴 드롭다운 설정 */
  userMenu?: SdSidebarUserMenu;
  /** 커스텀 클래스 */
  class?: string;
}

/**
 * 사이드바 사용자 영역 컴포넌트
 *
 * @remarks
 * - `children`: 사용자 정보 표시 영역
 * - `userMenu`: 드롭다운 메뉴 설정
 */
export function SdSidebarUser(props: SdSidebarUserProps) {
  const [local, rest] = splitProps(props, ["userMenu", "class", "children"]);

  const [menuOpen, setMenuOpen] = createSignal(false);

  const onMenuOpenButtonClick = () => {
    setMenuOpen((v) => !v);
  };

  // 키보드 접근성
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onMenuOpenButtonClick();
    }
  };

  return (
    <div class={twJoin("block", local.class)} {...rest}>
      {/* 사용자 정보 영역 */}
      <div class="p-4">{local.children}</div>

      {/* 메뉴 버튼 + 드롭다운 */}
      <Show when={local.userMenu} keyed>
        {(userMenu) => (
          <>
            {/* 메뉴 버튼 */}
            <div
              use:ripple={true}
              class={twJoin(
                "block",
                "cursor-pointer",
                "select-none",
                "px-ctrl",
                "py-ctrl-sm",
                "hover:bg-bg-hover",
              )}
              onClick={onMenuOpenButtonClick}
              onKeyDown={onKeyDown}
              tabindex={0}
              role="button"
              aria-expanded={menuOpen()}
            >
              {userMenu.title}
              <span class="float-right">
                <SdCollapseIcon open={menuOpen()} openRotate={180} />
              </span>
            </div>

            {/* 메뉴 드롭다운 */}
            <SdCollapse open={menuOpen()}>
              <SdList inset class="bg-bg-base/50 py-1">
                <For each={userMenu.menus}>
                  {(menu) => (
                    <SdListItem onClick={menu.onClick}>
                      {menu.title}
                    </SdListItem>
                  )}
                </For>
              </SdList>
            </SdCollapse>
          </>
        )}
      </Show>
    </div>
  );
}
