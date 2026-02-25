import type { JSX } from "solid-js";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { DataSheet } from "../../data/sheet/DataSheet";
import { Checkbox } from "../../form-control/checkbox/Checkbox";
import { borderDefault } from "../../../styles/tokens.styles";
import type { AppPerm } from "../../../helpers/createAppStructure";

const titleCellClass = clsx("flex items-stretch", "px-2");
const indentGuideWrapperClass = clsx("mr-1 flex w-3", "justify-center");
const indentGuideLineClass = clsx("w-0 self-stretch", "border-r", borderDefault);

// --- Types ---

export interface PermissionTableProps<TModule = string> {
  items?: AppPerm<TModule>[];
  value?: Record<string, boolean>;
  onValueChange?: (value: Record<string, boolean>) => void;
  modules?: TModule[];
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

// --- Utilities (also used in tests) ---

/** Collect all unique perm types from the tree */
export function collectAllPerms<TModule>(items: AppPerm<TModule>[]): string[] {
  const set = new Set<string>();
  const walk = (list: AppPerm<TModule>[]) => {
    for (const item of list) {
      if (item.perms) {
        for (const p of item.perms) set.add(p);
      }
      if (item.children) walk(item.children);
    }
  };
  walk(items);
  return [...set];
}

/** Filter by modules: keep only items that have intersection with active modules */
export function filterByModules<TModule>(
  items: AppPerm<TModule>[],
  modules: TModule[] | undefined,
): AppPerm<TModule>[] {
  if (!modules || modules.length === 0) return items;

  const result: AppPerm<TModule>[] = [];

  for (const item of items) {
    if (item.modules && !item.modules.some((m) => modules.includes(m))) {
      continue;
    }
    const children = item.children ? filterByModules(item.children, modules) : undefined;
    if (item.children && (!children || children.length === 0) && !item.perms) {
      continue;
    }
    result.push({ ...item, children });
  }

  return result;
}

/** Handle cascading when checkbox changes */
export function changePermCheck<TModule>(
  value: Record<string, boolean>,
  item: AppPerm<TModule>,
  perm: string,
  checked: boolean,
): Record<string, boolean> {
  const result = { ...value };

  const apply = (target: AppPerm<TModule>) => {
    if (target.perms && target.href != null && target.href !== "") {
      const permIndex = target.perms.indexOf(perm);

      if (permIndex >= 0) {
        const basePerm = target.perms[0];
        const baseOff = permIndex > 0 && checked && !result[target.href + "/" + basePerm];

        if (!baseOff) {
          result[target.href + "/" + perm] = checked;
        }
      }

      if (perm === target.perms[0] && !checked) {
        for (let i = 1; i < target.perms.length; i++) {
          result[target.href + "/" + target.perms[i]] = false;
        }
      }
    }

    if (target.children) {
      for (const child of target.children) {
        apply(child);
      }
    }
  };

  apply(item);
  return result;
}

// --- Internal Helpers ---

/** Check if item is visible by module filter (preserve object reference) */
function isItemVisible<TModule>(item: AppPerm<TModule>, modules: TModule[] | undefined): boolean {
  if (!modules || modules.length === 0) return true;
  if (item.modules && !item.modules.some((m) => modules.includes(m))) return false;
  if (!item.perms && item.children) {
    return item.children.some((child) => isItemVisible(child, modules));
  }
  return true;
}

/** Collect unique perm types from visible items only */
function collectVisiblePerms<TModule>(
  items: AppPerm<TModule>[],
  modules: TModule[] | undefined,
): string[] {
  const set = new Set<string>();

  function walk(list: AppPerm<TModule>[]) {
    for (const item of list) {
      if (!isItemVisible(item, modules)) continue;
      if (item.perms) {
        for (const p of item.perms) set.add(p);
      }
      if (item.children) walk(item.children);
    }
  }

  walk(items);
  return [...set];
}

/** Get check state of group node: true if any child is checked */
function isGroupPermChecked<TModule>(
  item: AppPerm<TModule>,
  perm: string,
  value: Record<string, boolean>,
): boolean {
  if (item.perms && item.href != null && item.href !== "") {
    return value[item.href + "/" + perm] ?? false;
  }
  if (item.children) {
    return item.children.some((child) => isGroupPermChecked(child, perm, value));
  }
  return false;
}

/** Check if specific perm exists in subtree */
function hasPermInTree<TModule>(item: AppPerm<TModule>, perm: string): boolean {
  if (item.perms?.includes(perm)) return true;
  if (item.children) {
    return item.children.some((child) => hasPermInTree(child, perm));
  }
  return false;
}

/** Check if perm should be disabled (base perm is off) */
function isPermDisabled<TModule>(
  item: AppPerm<TModule>,
  perm: string,
  value: Record<string, boolean>,
): boolean {
  if (!item.perms || item.href == null || item.href === "") return false;
  const basePerm = item.perms[0];
  if (perm === basePerm) return false;
  return !(value[item.href + "/" + basePerm] ?? false);
}

/** Collect all expandable items (preserve object reference) */
function collectExpandable<TModule>(
  items: AppPerm<TModule>[],
  getChildren: (item: AppPerm<TModule>) => AppPerm<TModule>[] | undefined,
): AppPerm<TModule>[] {
  const result: AppPerm<TModule>[] = [];

  function walk(list: AppPerm<TModule>[]) {
    for (const item of list) {
      const children = getChildren(item);
      if (children && children.length > 0) {
        result.push(item);
        walk(children);
      }
    }
  }

  walk(items);
  return result;
}

// --- Component ---

export const PermissionTable: Component<PermissionTableProps> = (props) => {
  const [local] = splitProps(props, [
    "items",
    "value",
    "onValueChange",
    "modules",
    "disabled",
    "class",
    "style",
  ]);

  // Visible top-level items (preserve object reference)
  const visibleItems = createMemo(() => {
    const items = local.items ?? [];
    if (!local.modules || local.modules.length === 0) return items;
    return items.filter((item) => isItemVisible(item, local.modules));
  });

  // Sheet's getChildren — apply module filter, preserve object reference
  const getChildren = (item: AppPerm): AppPerm[] | undefined => {
    if (!item.children || item.children.length === 0) return undefined;
    const modules = local.modules;
    if (!modules || modules.length === 0) return item.children;
    const filtered = item.children.filter((child) => isItemVisible(child, modules));
    return filtered.length > 0 ? filtered : undefined;
  };

  // All unique perm types from visible items
  const allPerms = createMemo(() => collectVisiblePerms(local.items ?? [], local.modules));

  const currentValue = createMemo(() => local.value ?? {});

  // Expanded state — all expanded by default
  const getAllExpandable = () => collectExpandable(visibleItems(), getChildren);

  const [expandedItems, setExpandedItems] = createSignal<AppPerm[]>(getAllExpandable());

  // Re-expand all when tree structure changes (e.g., module filter changed)
  createEffect(
    on(
      visibleItems,
      () => {
        setExpandedItems(getAllExpandable());
      },
      { defer: true },
    ),
  );

  const handlePermChange = (item: AppPerm, perm: string, checked: boolean) => {
    const newValue = changePermCheck(currentValue(), item, perm, checked);
    local.onValueChange?.(newValue);
  };

  return (
    <div data-permission-table class={twMerge(local.class)} style={local.style}>
      <DataSheet
        items={visibleItems()}
        getChildren={getChildren}
        expandedItems={expandedItems()}
        onExpandedItemsChange={setExpandedItems}
        hideConfigBar
      >
        <DataSheet.Column key="title" header="Permission Item" sortable={false} resizable={false}>
          {(ctx) => {
            const item = ctx.item as AppPerm;
            return (
              <div class={titleCellClass}>
                <For each={Array.from({ length: ctx.depth })}>
                  {() => (
                    <div class={indentGuideWrapperClass}>
                      <div class={indentGuideLineClass} />
                    </div>
                  )}
                </For>
                <span class="py-1">{item.title}</span>
              </div>
            );
          }}
        </DataSheet.Column>
        <For each={allPerms()}>
          {(perm) => (
            <DataSheet.Column key={`perm-${perm}`} header={perm} sortable={false} resizable={false}>
              {(ctx) => {
                const item = ctx.item as AppPerm;
                return (
                  <Show when={hasPermInTree(item, perm)}>
                    <Checkbox
                      value={isGroupPermChecked(item, perm, currentValue())}
                      onValueChange={(checked) => handlePermChange(item, perm, checked)}
                      disabled={local.disabled || isPermDisabled(item, perm, currentValue())}
                      inset
                    />
                  </Show>
                );
              }}
            </DataSheet.Column>
          )}
        </For>
      </DataSheet>
    </div>
  );
};
