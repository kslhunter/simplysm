import "@simplysm/core-common";
import { createSignal, For, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import { sidebarUser, sidebarUserContent, sidebarUserIconCircle } from "./sidebar-user.css";
import { Collapse } from "../collapse/collapse";
import { List } from "../../data/list/list";
import { ListItem } from "../../data/list/list-item";
import { ripple } from "../../../directives/ripple";
import { atoms } from "../../../styles/atoms.css";
import { IconUser } from "@tabler/icons-solidjs";

void ripple;

/**
 * SidebarUser 컴포넌트의 props
 *
 * @property name - 사용자 이름
 * @property description - 사용자 설명 (역할, 이메일 등)
 * @property menus - 사용자 메뉴 목록 (클릭 시 실행할 콜백 포함)
 */
export interface SidebarUserProps extends JSX.HTMLAttributes<HTMLDivElement> {
  name: string;
  description?: string;
  menus?: {
    title: string;
    onClick: () => void;
  }[];
}

/**
 * 사이드바 하단의 사용자 정보 컴포넌트
 *
 * 사용자 아이콘, 이름, 설명을 표시하며 클릭 시 사용자 메뉴를 펼친다.
 *
 * @example
 * ```tsx
 * <SidebarUser
 *   name="홍길동"
 *   description="관리자"
 *   menus={[
 *     { title: "프로필", onClick: () => navigate("/profile") },
 *     { title: "로그아웃", onClick: logout },
 *   ]}
 * />
 * ```
 */
export const SidebarUser: ParentComponent<SidebarUserProps> = (props) => {
  const [local, rest] = splitProps(props, ["menus", "name", "description"]);

  const [menuOpen, setMenuOpen] = createSignal(false);

  return (
    <div {...rest} class={[sidebarUser, rest.class].filter(Boolean).join(" ")}>
      <div class={sidebarUserContent} onClick={() => setMenuOpen((v) => !v)} use:ripple>
        <div class={sidebarUserIconCircle}>
          <IconUser size={20} />
        </div>
        <div>
          <div class={atoms({ fontWeight: "bold" })}>{local.name}</div>
          <Show when={local.description}>
            <div class={atoms({ fontSize: "sm", color: "muted" })}>{local.description}</div>
          </Show>
        </div>
      </div>

      <Collapse open={menuOpen()}>
        <List inset>
          <For each={local.menus}>
            {(menuItem) => <ListItem onClick={menuItem.onClick}>{menuItem.title}</ListItem>}
          </For>
        </List>
      </Collapse>
    </div>
  );
};
