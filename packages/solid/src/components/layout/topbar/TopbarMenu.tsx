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
import { useI18nOptional } from "../../../providers/i18n/I18nContext";

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
   * Menu items array
   */
  menus: TopbarMenuItem[];
}

/**
 * Topbar dropdown menu component
 *
 * @remarks
 * - Items with children: show dropdown on click
 * - Items without children: navigate directly on click
 * - External links (containing ://): open in new tab
 * - Selection determined by exact pathname match
 * - Submenus rendered with List/ListItem (all levels expanded)
 *
 * @example
 * ```tsx
 * <TopbarMenu menus={[
 *   { title: "Dashboard", href: "/dashboard", icon: IconHome },
 *   {
 *     title: "Menu 1",
 *     icon: IconFolder,
 *     children: [
 *       { title: "Submenu 1", href: "/menu1/sub1" },
 *       { title: "Submenu 2", href: "/menu1/sub2" },
 *     ],
 *   },
 * ]} />
 * ```
 */
export const TopbarMenu: Component<TopbarMenuProps> = (props) => {
  const [local, rest] = splitProps(props, ["menus", "class"]);
  const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
  const i18n = useI18nOptional();

  return (
    <>
      {/* Desktop menu (shown only on 640px and above) */}
      <nav {...rest} data-topbar-menu class={twMerge(desktopNavBaseClass, local.class)}>
        <For each={local.menus}>{(menu) => <TopbarMenuButton menu={menu} />}</For>
      </nav>

      {/* Mobile hamburger (shown only below 640px) */}
      <div class={mobileWrapperClass}>
        <Dropdown open={mobileMenuOpen()} onOpenChange={setMobileMenuOpen}>
          <Dropdown.Trigger>
            <Button
              variant="ghost"
              aria-label={i18n?.t("topbarMenu.menu") ?? "Menu"}
              aria-haspopup="menu"
              aria-expanded={mobileMenuOpen()}
            >
              <Icon icon={IconDotsVertical} size="1.25em" />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <List inset>
              <For each={local.menus}>
                {(menu) => (
                  <TopbarMenuDropdownItem menu={menu} onClose={() => setMobileMenuOpen(false)} />
                )}
              </For>
            </List>
          </Dropdown.Content>
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

  const hasChildren = () => props.menu.children !== undefined && props.menu.children.length > 0;
  const isExternalLink = () => props.menu.href?.includes("://") ?? false;

  const isAnyChildSelected = (items: TopbarMenuItem[]): boolean => {
    for (const item of items) {
      if (item.href === location.pathname) return true;
      if (item.children && isAnyChildSelected(item.children)) return true;
    }
    return false;
  };

  // Check if current menu or submenu is selected (cached with createMemo)
  const isSelected = createMemo(() => {
    if (props.menu.href === location.pathname) return true;
    if (props.menu.children) {
      return isAnyChildSelected(props.menu.children);
    }
    return false;
  });

  const handleNavigate = () => {
    if (props.menu.href !== undefined) {
      if (isExternalLink()) {
        window.open(props.menu.href, "_blank", "noopener,noreferrer");
      } else {
        navigate(props.menu.href);
      }
    }
  };

  const buttonContent = () => (
    <Button
      variant={isSelected() ? "solid" : "ghost"}
      theme={isSelected() ? "primary" : "base"}
      class={menuButtonContentClass}
      aria-haspopup={hasChildren() ? "menu" : undefined}
      aria-expanded={hasChildren() ? open() : undefined}
      onClick={hasChildren() ? undefined : handleNavigate}
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
  );

  return (
    <Show when={hasChildren()} fallback={buttonContent()}>
      <Dropdown open={open()} onOpenChange={setOpen}>
        <Dropdown.Trigger>{buttonContent()}</Dropdown.Trigger>
        <Dropdown.Content>
          <List inset>
            <For each={props.menu.children}>
              {(child) => <TopbarMenuDropdownItem menu={child} onClose={() => setOpen(false)} />}
            </For>
          </List>
        </Dropdown.Content>
      </Dropdown>
    </Show>
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
    // if no href but has children, clicking doesn't close the menu
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
