import "@simplysm/core-common";
import {
  type Component,
  createSignal,
  For,
  type JSX,
  type ParentComponent,
  splitProps,
} from "solid-js";
import { topbarUser } from "./topbar-user.css";
import { Dropdown } from "../../overlay/dropdown/dropdown";
import { DropdownPopup } from "../../overlay/dropdown/dropdown-popup";
import { useDropdown } from "../../overlay/dropdown/dropdown-context";
import { Button } from "../../controls/button/button";
import { List } from "../../data/list/list";
import { ListItem } from "../../data/list/list-item";

/**
 * TopbarUser 메뉴 아이템 타입
 */
export interface TopbarUserMenuItem {
  title: string;
  onClick: () => void;
}

/**
 * TopbarUser 컴포넌트의 props
 *
 * @property menus - 사용자 메뉴 배열
 * @property children - 트리거 버튼에 표시할 내용 (사용자 이름 등)
 */
export interface TopbarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  menus: TopbarUserMenuItem[];
  children?: JSX.Element;
}

/**
 * 탑바 사용자 메뉴 컴포넌트
 *
 * 사용자 이름 등을 클릭하면 드롭다운으로 메뉴가 표시된다.
 * 로그아웃, 프로필 등의 메뉴를 제공할 때 사용한다.
 *
 * @example
 * ```tsx
 * const userMenus = [
 *   { title: "프로필", onClick: () => navigate("/profile") },
 *   { title: "로그아웃", onClick: handleLogout },
 * ];
 *
 * <TopbarUser menus={userMenus}>홍길동</TopbarUser>
 * ```
 */
export const TopbarUser: ParentComponent<TopbarUserProps> = (props) => {
  const [local, rest] = splitProps(props, ["menus", "children", "class"]);
  const [open, setOpen] = createSignal(false);

  return (
    <div {...rest} class={[topbarUser, local.class].filter(Boolean).join(" ")}>
      <Dropdown open={open()} onOpenChange={setOpen}>
        <Button link>{local.children}</Button>
        <TopbarUserPopup menus={local.menus} />
      </Dropdown>
    </div>
  );
};

/**
 * 사용자 메뉴 드롭다운 팝업 (useDropdown으로 close 접근)
 */
const TopbarUserPopup: Component<{ menus: TopbarUserMenuItem[] }> = (props) => {
  const dropdown = useDropdown();

  return (
    <DropdownPopup>
      <List>
        <For each={props.menus}>
          {(menu) => (
            <ListItem
              onClick={() => {
                menu.onClick();
                dropdown?.close();
              }}
            >
              {menu.title}
            </ListItem>
          )}
        </For>
      </List>
    </DropdownPopup>
  );
};
