import { createSignal, For, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import { IconChevronDown } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { Icon } from "../../display/Icon";
import { twMerge } from "tailwind-merge";
import { Button } from "../../form-control/Button";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { ListItem } from "../../data/list/ListItem";

const wrapperBaseClass = clsx("flex items-center");
const buttonContentClass = clsx("flex items-center", "gap-1");

export interface TopbarUserMenu {
  title: string;
  onClick: () => void;
}

export interface TopbarUserProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  /**
   * Dropdown menu (dropdown shown only when provided)
   */
  menus?: TopbarUserMenu[];

  /**
   * User information area (customizable)
   */
  children: JSX.Element;
}

/**
 * Topbar user information component
 *
 * @remarks
 * - Customize user info display with children
 * - When menus provided, click shows Dropdown menu
 * - Uses Button's ghost style
 *
 * @example
 * ```tsx
 * <TopbarUser menus={[
 *   { title: "Profile", onClick: () => navigate("/profile") },
 *   { title: "Logout", onClick: handleLogout },
 * ]}>
 *   <span>Username</span>
 * </TopbarUser>
 * ```
 */
export const TopbarUser: ParentComponent<TopbarUserProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "menus"]);

  const [open, setOpen] = createSignal(false);

  const hasMenus = () => local.menus !== undefined && local.menus.length > 0;

  const handleMenuClick = (menu: TopbarUserMenu) => {
    setOpen(false);
    menu.onClick();
  };

  const getClassName = () => twMerge(wrapperBaseClass, local.class);

  const buttonContent = () => (
    <Button
      variant="ghost"
      class={buttonContentClass}
      aria-haspopup={hasMenus() ? "menu" : undefined}
      aria-expanded={hasMenus() ? open() : undefined}
    >
      {local.children}
      <Show when={hasMenus()}>
        <Icon
          icon={IconChevronDown}
          size="1em"
          class={clsx("transition-transform", open() && "rotate-180")}
        />
      </Show>
    </Button>
  );

  return (
    <div {...rest} data-topbar-user class={getClassName()}>
      <Show when={hasMenus()} fallback={buttonContent()}>
        <Dropdown open={open()} onOpenChange={setOpen}>
          <Dropdown.Trigger>{buttonContent()}</Dropdown.Trigger>
          <Dropdown.Content>
            <List inset>
              <For each={local.menus}>
                {(menu) => <ListItem onClick={() => handleMenuClick(menu)}>{menu.title}</ListItem>}
              </For>
            </List>
          </Dropdown.Content>
        </Dropdown>
      </Show>
    </div>
  );
};
