import { type Component, For, Show } from "solid-js";
import clsx from "clsx";
import { CheckBox } from "../../form-control/checkbox/CheckBox";
import type { PermissionItem } from "./PermissionTable";
import {
  trBaseClass,
  getDepthClass,
  tdTitleClass,
  tdPermClass,
  collapseButtonClass,
  chevronClass,
  chevronOpenClass,
} from "./PermissionTable.styles";

export interface PermissionTableRowProps<TModule = string> {
  item: PermissionItem<TModule>;
  depth: number;
  allPerms: () => string[];
  value: () => Record<string, boolean>;
  collapsedSet: () => Set<string>;
  disabled?: boolean;
  onToggleCollapse: (key: string) => void;
  onPermChange: (item: PermissionItem<TModule>, perm: string, checked: boolean) => void;
}

/** 그룹 노드의 체크 상태: 하위 중 하나라도 체크면 true */
function isGroupPermChecked<TModule>(
  item: PermissionItem<TModule>,
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

/** 그룹 노드에서 특정 perm 존재 여부: 하위에 하나라도 있으면 true */
function hasPermInTree<TModule>(item: PermissionItem<TModule>, perm: string): boolean {
  if (item.perms?.includes(perm)) return true;
  if (item.children) {
    return item.children.some((child) => hasPermInTree(child, perm));
  }
  return false;
}

/** 아이템의 고유 키 (collapse 식별용) */
function itemKey<TModule>(item: PermissionItem<TModule>): string {
  return item.href ?? item.title;
}

/** 기본 권한(perms[0])이 꺼져 있어서 비활성화해야 하는지 */
function isPermDisabled<TModule>(
  item: PermissionItem<TModule>,
  perm: string,
  value: Record<string, boolean>,
): boolean {
  if (!item.perms || item.href == null || item.href === "") return false;
  const basePerm = item.perms[0];
  if (perm === basePerm) return false;
  return !(value[item.href + "/" + basePerm] ?? false);
}

export const PermissionTableRow: Component<PermissionTableRowProps> = (props) => {
  const hasChildren = () => (props.item.children?.length ?? 0) > 0;
  const isCollapsed = () => props.collapsedSet().has(itemKey(props.item));

  const depthClass = () => getDepthClass(props.depth);

  return (
    <>
      <tr class={clsx(trBaseClass, depthClass())}>
        {/* 타이틀 셀 */}
        <td
          class={tdTitleClass}
          style={{ "padding-left": `${props.depth * 1.5 + 0.5}rem` }}
        >
          <Show
            when={hasChildren()}
            fallback={<span>{props.item.title}</span>}
          >
            <button
              type="button"
              class={collapseButtonClass}
              onClick={() => props.onToggleCollapse(itemKey(props.item))}
            >
              <span
                class={clsx(chevronClass, !isCollapsed() && chevronOpenClass)}
                style={{ "font-size": "0.75rem" }}
              >
                &#9654;
              </span>
              {props.item.title}
            </button>
          </Show>
        </td>

        {/* 권한 셀들 */}
        <For each={props.allPerms()}>
          {(perm) => (
            <td class={tdPermClass}>
              <Show when={hasPermInTree(props.item, perm)}>
                <CheckBox
                  value={isGroupPermChecked(props.item, perm, props.value())}
                  onValueChange={(checked) => props.onPermChange(props.item, perm, checked)}
                  disabled={
                    props.disabled ||
                    isPermDisabled(props.item, perm, props.value())
                  }
                  inset
                  inline
                />
              </Show>
            </td>
          )}
        </For>
      </tr>

      {/* 하위 행 (재귀) */}
      <Show when={hasChildren() && !isCollapsed()}>
        <For each={props.item.children}>
          {(child) => (
            <PermissionTableRow
              item={child}
              depth={props.depth + 1}
              allPerms={props.allPerms}
              value={props.value}
              collapsedSet={props.collapsedSet}
              disabled={props.disabled}
              onToggleCollapse={props.onToggleCollapse}
              onPermChange={props.onPermChange}
            />
          )}
        </For>
      </Show>
    </>
  );
};
