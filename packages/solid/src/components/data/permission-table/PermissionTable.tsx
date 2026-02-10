import { type Component, createMemo, createSignal, For, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import {
  tableBaseClass,
  thClass,
  thPermClass,
} from "./PermissionTable.styles";
import { PermissionTableRow } from "./PermissionTableRow";

// --- 타입 ---

export interface PermissionItem<TModule = string> {
  title: string;
  href?: string;
  modules?: TModule[];
  perms?: string[];
  children?: PermissionItem<TModule>[];
}

export interface PermissionTableProps<TModule = string> {
  items?: PermissionItem<TModule>[];
  value?: Record<string, boolean>;
  onValueChange?: (value: Record<string, boolean>) => void;
  modules?: TModule[];
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

// --- 유틸리티 ---

/** 트리에서 모든 고유 perm 타입을 수집 */
export function collectAllPerms<TModule>(items: PermissionItem<TModule>[]): string[] {
  const set = new Set<string>();
  const walk = (list: PermissionItem<TModule>[]) => {
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
  items: PermissionItem<TModule>[],
  modules: TModule[] | undefined,
): PermissionItem<TModule>[] {
  if (!modules || modules.length === 0) return items;

  const result: PermissionItem<TModule>[] = [];

  for (const item of items) {
    // 이 아이템에 modules가 있는데 교차가 없으면 제외
    if (item.modules && !item.modules.some((m) => modules.includes(m))) {
      continue;
    }
    // children도 재귀 필터
    const children = item.children ? filterByModules(item.children, modules) : undefined;
    // children이 있었는데 전부 필터링되면 이 그룹도 제외
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
  item: PermissionItem<TModule>,
  perm: string,
  checked: boolean,
): Record<string, boolean> {
  const result = { ...value };

  const apply = (target: PermissionItem<TModule>) => {
    if (target.perms && target.href != null && target.href !== "") {
      const permIndex = target.perms.indexOf(perm);

      if (permIndex >= 0) {
        // 기본 권한이 아닌 perm 체크 시, 기본 권한이 꺼져있으면 이 아이템만 건너뜀
        const basePerm = target.perms[0];
        const baseOff = permIndex > 0 && checked && !result[target.href + "/" + basePerm];

        if (!baseOff) {
          result[target.href + "/" + perm] = checked;
        }
      }

      // 기본 권한(perms[0]) 해제 시 나머지도 해제
      if (perm === target.perms[0] && !checked) {
        for (let i = 1; i < target.perms.length; i++) {
          result[target.href + "/" + target.perms[i]] = false;
        }
      }
    }

    // cascading down — 항상 실행됨
    if (target.children) {
      for (const child of target.children) {
        apply(child);
      }
    }
  };

  apply(item);
  return result;
}

// --- 컴포넌트 ---

export const PermissionTable: Component<PermissionTableProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "items", "value", "onValueChange", "modules", "disabled", "class", "style",
  ]);

  const filteredItems = createMemo(() =>
    filterByModules(local.items ?? [], local.modules),
  );

  const allPerms = createMemo(() => collectAllPerms(filteredItems()));

  const currentValue = createMemo(() => local.value ?? {});

  const [collapsedSet, setCollapsedSet] = createSignal(new Set<string>());

  const handleToggleCollapse = (key: string) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handlePermChange = (item: PermissionItem, perm: string, checked: boolean) => {
    const newValue = changePermCheck(currentValue(), item, perm, checked);
    local.onValueChange?.(newValue);
  };

  const getClassName = () => twMerge(tableBaseClass, local.class);

  return (
    <table class={getClassName()} style={local.style} {...rest} data-permission-table>
      <thead>
        <tr>
          <th class={thClass}>권한 항목</th>
          <For each={allPerms()}>
            {(perm) => <th class={clsx(thClass, thPermClass)}>{perm}</th>}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={filteredItems()}>
          {(item) => (
            <PermissionTableRow
              item={item}
              depth={0}
              allPerms={allPerms}
              value={currentValue}
              collapsedSet={collapsedSet}
              disabled={local.disabled}
              onToggleCollapse={handleToggleCollapse}
              onPermChange={handlePermChange}
            />
          )}
        </For>
      </tbody>
    </table>
  );
};
