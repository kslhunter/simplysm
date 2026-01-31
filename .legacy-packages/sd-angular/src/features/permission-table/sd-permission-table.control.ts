import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { SdCheckboxControl } from "../../ui/form/choice/sd-checkbox.control";
import { SdCollapseIconControl } from "../../ui/navigation/collapse/sd-collapse-icon.control";
import { SdTypedTemplateDirective } from "../../core/directives/sd-typed-template.directive";
import { $computed } from "../../core/utils/bindings/$computed";
import { $signal } from "../../core/utils/bindings/$signal";
import { transformBoolean } from "../../core/utils/transforms/transformBoolean";
import type { ISdPermission } from "../../core/providers/app/sd-app-structure.provider";
import { SdAnchorControl } from "../../ui/form/button/sd-anchor.control";
import { tablerChevronRight } from "@ng-icons/tabler-icons";

/**
 * 권한 테이블 컴포넌트
 *
 * 권한 설정을 위한 테이블 형태의 UI를 제공하는 컴포넌트입니다.
 * 계층형 구조의 권한을 표시하고 관리할 수 있습니다.
 *
 * - 계층형 구조로 권한 항목들을 표시합니다
 * - 각 권한 항목에 대해 체크박스로 권한 부여/해제가 가능합니다
 * - 상위 권한 체크시 하위 권한들도 자동으로 체크됩니다
 * - 접기/펼치기 기능으로 하위 권한 목록을 관리할 수 있습니다
 *
 * ```html
 * <sd-permission-table [items]="permissions" [(value)]="data" />
 * ```
 */
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
      @if ((item.children && item.children.length !== 0) || (item.perms && item.perms.length > 0)) {
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
                <sd-collapse-icon [icon]="tablerChevronRight" [open]="getIsPermCollapsed(item)" />
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
  disabled = input(false, { transform: transformBoolean });

  collapsedItems = $signal(new Set<ISdPermission<TModule>>());

  depthLength = $computed(() => {
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
      const r = ObjectUtils.clone(v);
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
        !value[permCode + ".edit"]
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
  protected readonly tablerChevronRight = tablerChevronRight;
}
