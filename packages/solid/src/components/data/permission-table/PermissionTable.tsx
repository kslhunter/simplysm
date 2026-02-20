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
import { DataSheet } from "../sheet/DataSheet";
import { Checkbox } from "../../form-control/checkbox/Checkbox";
import { borderDefault } from "../../../styles/tokens.styles";
import type { AppPerm } from "../../../helpers/createAppStructure";

const titleCellClass = clsx("flex items-stretch", "px-2");
const indentGuideWrapperClass = clsx("mr-1 flex w-3", "justify-center");
const indentGuideLineClass = clsx("w-0 self-stretch", "border-r", borderDefault);

// --- 타입 ---

export interface PermissionTableProps<TModule = string> {
  items?: AppPerm<TModule>[];
  value?: Record<string, boolean>;
  onValueChange?: (value: Record<string, boolean>) => void;
  modules?: TModule[];
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

// --- 유틸리티 (테스트에서도 사용) ---

/** 트리에서 모든 고유 perm 타입을 수집 */
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

/** modules 필터: 활성 모듈과 교차가 있는 아이템만 남김 */
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

/** 체크 변경 시 cascading 처리 */
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

// --- 내부 헬퍼 ---

/** 모듈 필터에 의해 보이는지 확인 (객체 참조 유지) */
function isItemVisible<TModule>(item: AppPerm<TModule>, modules: TModule[] | undefined): boolean {
  if (!modules || modules.length === 0) return true;
  if (item.modules && !item.modules.some((m) => modules.includes(m))) return false;
  if (!item.perms && item.children) {
    return item.children.some((child) => isItemVisible(child, modules));
  }
  return true;
}

/** 보이는 아이템에서만 고유 perm 타입 수집 */
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

/** 그룹 노드의 체크 상태: 하위 중 하나라도 체크면 true */
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

/** 하위에 특정 perm이 하나라도 있으면 true */
function hasPermInTree<TModule>(item: AppPerm<TModule>, perm: string): boolean {
  if (item.perms?.includes(perm)) return true;
  if (item.children) {
    return item.children.some((child) => hasPermInTree(child, perm));
  }
  return false;
}

/** 기본 권한(perms[0])이 꺼져 있어서 비활성화해야 하는지 */
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

/** 확장 가능한 모든 아이템 수집 (객체 참조 유지) */
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

// --- 컴포넌트 ---

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

  // 보이는 최상위 아이템 (객체 참조 유지)
  const visibleItems = createMemo(() => {
    const items = local.items ?? [];
    if (!local.modules || local.modules.length === 0) return items;
    return items.filter((item) => isItemVisible(item, local.modules));
  });

  // Sheet의 getChildren — 모듈 필터 적용, 객체 참조 유지
  const getChildren = (item: AppPerm): AppPerm[] | undefined => {
    if (!item.children || item.children.length === 0) return undefined;
    const modules = local.modules;
    if (!modules || modules.length === 0) return item.children;
    const filtered = item.children.filter((child) => isItemVisible(child, modules));
    return filtered.length > 0 ? filtered : undefined;
  };

  // 보이는 아이템의 모든 고유 perm 타입
  const allPerms = createMemo(() => collectVisiblePerms(local.items ?? [], local.modules));

  const currentValue = createMemo(() => local.value ?? {});

  // 확장 상태 — 기본적으로 모두 펼침
  const getAllExpandable = () => collectExpandable(visibleItems(), getChildren);

  const [expandedItems, setExpandedItems] = createSignal<AppPerm[]>(getAllExpandable());

  // 트리 구조 변경 시 모두 다시 펼침 (모듈 필터 변경 등)
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
        <DataSheet.Column key="title" header="권한 항목" sortable={false} resizable={false}>
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
