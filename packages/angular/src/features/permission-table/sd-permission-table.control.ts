import { NgTemplateOutlet } from "@angular/common";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { obj } from "@simplysm/core-common";
import type { ISdPermission } from "../../core/providers/sd-app-structure.provider";
import { SdCheckboxControl } from "../../ui/form/checkbox/sd-checkbox.control";
import { SdCollapseIconControl } from "../../ui/navigation/collapse/sd-collapse-icon.control";
import { SdTypedTemplateDirective } from "../../core/directives/sd-typed-template.directive";
import { SdAnchorControl } from "../../ui/form/button/sd-anchor.control";

@Component({
  selector: "sd-permission-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTypedTemplateDirective,
    NgTemplateOutlet,
    SdCollapseIconControl,
    SdCheckboxControl,
    SdAnchorControl,
  ],
  styles: [
    /* language=SCSS */ `
      sd-permission-table {
        table {
          border-collapse: collapse;

          > * > tr {
            > * {
              padding: var(--gap-sm) var(--gap-lg);
              position: sticky;
              top: 0;
              border-top: 1px solid transparent;
              border-bottom: 1px solid transparent;

              color: var(--text-trans-default);

              > * {
                color: var(--text-trans-default) !important;
              }

              &._title {
                border-top-left-radius: 14px;
                border-bottom-left-radius: 14px;
                padding-left: var(--gap-lg);
              }
            }

            &[data-sd-collapse="true"] {
              display: none;
            }

            &[data-sd-theme="first"] {
              > * {
                &._title,
                &._after {
                  background: var(--theme-info-default);

                  color: var(--text-trans-rev-default);

                  > * {
                    color: var(--text-trans-rev-default) !important;
                  }
                }
              }
            }

            &[data-sd-theme="info"] {
              > * {
                &._title,
                &._after {
                  background: var(--theme-info-lightest);
                }
              }
            }

            &[data-sd-theme="warning"] {
              > * {
                &._title,
                &._after {
                  background: var(--theme-warning-lightest);
                }
              }
            }

            &[data-sd-theme="success"] {
              > * {
                &._title,
                &._after {
                  background: var(--theme-success-lightest);
                }
              }
            }
          }
        }
      }
    `,
  ],
  template: `
    <table>
      <tbody>
        @for (item of items(); track item.codeChain.join(".")) {
          <ng-template
            [ngTemplateOutlet]="itemTpl"
            [ngTemplateOutletContext]="{
              item: item,
              parentKey: 'root',
              depth: 0,
              parent: undefined,
            }"
          ></ng-template>
        }
      </tbody>
    </table>

    <ng-template
      #itemTpl
      [typed]="itemTemplateType"
      let-item="item"
      let-parentKey="parentKey"
      let-depth="depth"
      let-parent="parent"
    >
      @if (
        (item.children && item.children.length !== 0) || (item.perms && item.perms.length > 0)
      ) {
        <tr
          [attr.data-sd-collapse]="!!parent && getIsPermCollapsed(parent)"
          [attr.data-sd-theme]="
            depth === 0
              ? 'first'
              : depth % 3 === 0
                ? 'success'
                : depth % 3 === 1
                  ? 'info'
                  : 'warning'
          "
        >
          @for (i of arr(depth + 1); track i) {
            <td class="_before">&nbsp;</td>
          }

          <td class="_title">
            @if (item.children && item.children.length > 0) {
              <sd-anchor (click)="onPermCollapseToggle(item)">
                <sd-collapse-icon [open]="getIsPermCollapsed(item)" />
                {{ item.title }}
              </sd-anchor>
            } @else {
              <div style="padding-left: 14px;">
                {{ item.title }}
              </div>
            }
          </td>

          @for (i of arr(depthLength() - (depth + 1)); track i) {
            <td class="_after">&nbsp;</td>
          }

          <td class="_after">
            @if (getIsPermExists(item, "use")) {
              <sd-checkbox
                [inline]="true"
                [value]="getIsPermChecked(item, 'use')"
                (valueChange)="onPermCheckChange(item, 'use', $event)"
                [disabled]="disabled()"
              >
                사용
              </sd-checkbox>
            }
          </td>

          <td class="_after">
            @if (getIsPermExists(item, "edit")) {
              <sd-checkbox
                [inline]="true"
                [value]="getIsPermChecked(item, 'edit')"
                (valueChange)="onPermCheckChange(item, 'edit', $event)"
                [disabled]="getEditDisabled(item)"
              >
                편집
              </sd-checkbox>
            }
          </td>
        </tr>
      }
      @if (item.children && item.children.length > 0) {
        @for (child of item.children; track child.codeChain.join(".")) {
          <ng-template
            [ngTemplateOutlet]="itemTpl"
            [ngTemplateOutletContext]="{
              item: child,
              parentKey: parentKey + '_' + item.codeChain.join('.'),
              depth: depth + 1,
              parent: item,
            }"
          ></ng-template>
        }
      }
    </ng-template>
  `,
})
export class SdPermissionTableControl<TModule> {
  value = model<Record<string, boolean>>({});

  items = input<ISdPermission<TModule>[]>([]);
  disabled = input(false, { transform: booleanAttribute });

  collapsedItems = signal(new Set<ISdPermission<TModule>>());

  depthLength = computed(() => {
    return this._getDepthLength(this.items(), 0);
  });

  arr(len: number): number[] {
    return Array(len)
      .fill(0)
      .map((_, i) => i);
  }

  getIsPermCollapsed(item: ISdPermission<TModule>): boolean {
    return this.collapsedItems().has(item);
  }

  getAllChildren(item: ISdPermission<TModule>): ISdPermission<TModule>[] {
    return item.children?.mapMany((child) => [child, ...this.getAllChildren(child)]) ?? [];
  }

  getEditDisabled(item: ISdPermission<TModule>) {
    if (this.disabled()) {
      return true;
    }

    if (item.perms) {
      if (this.getIsPermExists(item, "use") && !this.getIsPermChecked(item, "use")) {
        return true;
      }
    } else {
      if (
        item.children?.every(
          (child) => !this.getIsPermExists(child, "edit") || this.getEditDisabled(child),
        )
      ) {
        return true;
      }
    }

    return false;
  }

  getIsPermExists(item: ISdPermission<TModule>, type: "use" | "edit"): boolean {
    if (item.perms) {
      return item.perms.includes(type);
    }

    if (item.children) {
      for (const child of item.children) {
        if (this.getIsPermExists(child, type)) {
          return true;
        }
      }
    }

    return false;
  }

  getIsPermChecked(item: ISdPermission<TModule>, type: "use" | "edit"): boolean {
    if (item.perms) {
      const permCode = item.codeChain.join(".");
      return this.value()[permCode + "." + type] ?? false;
    }

    if (item.children) {
      for (const child of item.children) {
        if (this.getIsPermChecked(child, type)) {
          return true;
        }
      }
    }

    return false;
  }

  onPermCollapseToggle(item: ISdPermission<TModule>) {
    this.collapsedItems.update((v) => {
      const r = new Set(v);
      if (r.has(item)) {
        r.delete(item);
      } else {
        r.add(item);
        const allChildren = this.getAllChildren(item);
        for (const allChild of allChildren) {
          r.add(allChild);
        }
      }
      return r;
    });
  }

  onPermCheckChange(item: ISdPermission<TModule>, type: "use" | "edit", val: boolean) {
    this.value.update((v) => {
      const r = obj.clone(v);
      this._changePermCheck(r, item, type, val);
      return r;
    });
  }

  private _changePermCheck(
    value: Record<string, boolean>,
    item: ISdPermission<TModule>,
    type: "use" | "edit",
    val: boolean,
  ) {
    let changed = false;

    if (item.perms) {
      const permCode = item.codeChain.join(".");

      if (
        type === "edit" &&
        val &&
        this.getIsPermExists(item, "use") &&
        !this.getIsPermChecked(item, "use")
      ) {
        // use가 체크되지 않은 상태에서 edit 체크 시도 → 무시
      } else {
        if (this.getIsPermExists(item, type) && value[permCode + "." + type] !== val) {
          value[permCode + "." + type] = val;
          changed = true;
        }
      }

      // USE권한 지우면 EDIT권한도 자동으로 지움
      if (
        type === "use" &&
        !val &&
        this.getIsPermExists(item, "edit") &&
        value[permCode + ".edit"]
      ) {
        value[permCode + ".edit"] = false;
        changed = true;
      }
    }

    // 하위 권한을 함께 변경함
    if (item.children) {
      for (const child of item.children) {
        const childChanged = this._changePermCheck(value, child, type, val);
        if (childChanged) {
          changed = true;
        }
      }
    }

    return changed;
  }

  private _getDepthLength(items: ISdPermission<TModule>[], depth: number): number {
    return (
      items.max((item) => {
        if (item.children) {
          return this._getDepthLength(item.children, depth + 1);
        } else {
          return depth + 1;
        }
      }) ?? depth
    );
  }

  protected readonly itemTemplateType!: {
    item: ISdPermission<TModule>;
    parentKey: string;
    depth: number;
    parent: ISdPermission<TModule> | undefined;
  };
}
