import { ChangeDetectionStrategy, Component, inject, input, model, ViewEncapsulation } from "@angular/core";
import { SdAnchorControl } from "./SdAnchorControl";
import { ISdPermission } from "../utils/SdAppStructureUtil";
import { SdTypedTemplateDirective } from "../directives/SdTypedTemplateDirective";
import { NgTemplateOutlet } from "@angular/common";
import { SdCollapseIconControl } from "./SdCollapseIconControl";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { $computed, $signal } from "../utils/$hooks";

@Component({
  selector: "sd-permission-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdTypedTemplateDirective, NgTemplateOutlet, SdCollapseIconControl, SdCheckboxControl],
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

            &[sd-collapse="true"] {
              display: none;
            }

            &[sd-theme="first"] {
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

            &[sd-theme="info"] {
              > * {
                &._title,
                &._after {
                  background: var(--theme-info-lightest);
                }
              }
            }

            &[sd-theme="warning"] {
              > * {
                &._title,
                &._after {
                  background: var(--theme-warning-lightest);
                }
              }
            }

            &[sd-theme="success"] {
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
        @for (item of items(); track item.codes.join(".")) {
          <ng-template
            [ngTemplateOutlet]="itemTemplate"
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
      #itemTemplate
      [typed]="itemTemplateType"
      let-item="item"
      let-parentKey="parentKey"
      let-depth="depth"
      let-parent="parent"
    >
      @if ((item.children && item.children.length !== 0) || (item.perms && item.perms.length > 0)) {
        <tr
          [attr.sd-collapse]="!!parent && getIsPermCollapsed(parent)"
          [attr.sd-theme]="depth === 0 ? 'first' : depth % 3 === 0 ? 'success' : depth % 3 === 1 ? 'info' : 'warning'"
        >
          @for (_ of arr(depth + 1); let i = $index; track i) {
            <td class="_before">&nbsp;</td>
          }

          <td class="_title">
            @if (item.children && item.children.length > 0) {
              <sd-anchor (click)="onPermCollapseToggle(item)">
                <sd-collapse-icon [icon]="icons.angleRight" [open]="getIsPermCollapsed(item)" />
                {{ item.title }}
              </sd-anchor>
            } @else {
              <div style="padding-left: 14px;">
                {{ item.title }}
              </div>
            }
          </td>

          @for (_ of arr(depthLength() - (depth + 1)); let i = $index; track i) {
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
        @for (child of item.children; track child.codes.join(".")) {
          <ng-template
            [ngTemplateOutlet]="itemTemplate"
            [ngTemplateOutletContext]="{
              item: child,
              parentKey: parentKey + '_' + item.codes.join('.'),
              depth: depth + 1,
              parent: item,
            }"
          ></ng-template>
        }
      }
    </ng-template>
  `,
})
export class SdPermissionTableControl {
  icons = inject(SdAngularConfigProvider).icons;

  value = model<Record<string, boolean>>({});

  items = input<ISdPermission[]>([]);
  disabled = input(false);

  collapsedItems = $signal(new Set<ISdPermission>());

  depthLength = $computed(() => {
    return this.#getDepthLength(this.items(), 0);
  });

  arr(len: number): number[] {
    return Array(len).fill(0);
  }

  getIsPermCollapsed(item: ISdPermission): boolean {
    return this.collapsedItems().has(item);
  }

  getAllChildren(item: ISdPermission): ISdPermission[] {
    return item.children?.mapMany((child) => [child, ...this.getAllChildren(child)]) ?? [];
  }

  getEditDisabled(item: ISdPermission) {
    if (this.disabled()) {
      return true;
    }

    if (item.perms) {
      if (this.getIsPermExists(item, "use") && !this.getIsPermChecked(item, "use")) {
        return true;
      }
    } else {
      if (item.children?.every((child) => !this.getIsPermExists(child, "edit") || this.getEditDisabled(child))) {
        return true;
      }
    }

    return false;
  }

  getIsPermExists(item: ISdPermission, type: "use" | "edit"): boolean {
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

  getIsPermChecked(item: ISdPermission, type: "use" | "edit"): boolean {
    if (item.perms) {
      const permCode = item.codes.join(".");
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

  onPermCollapseToggle(item: ISdPermission) {
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

  onPermCheckChange(item: ISdPermission, type: "use" | "edit", val: boolean) {
    if (item.perms) {
      const permCode = item.codes.join(".");

      if (type === "edit" && val && !this.getIsPermChecked(item, "use")) {
      } else {
        if (this.getIsPermExists(item, type)) {
          this.value.update((v) => ({
            ...v,
            [permCode + "." + type]: val,
          }));
        }
      }

      // USE권한 지우면 EDIT권한도 자동으로 지움
      if (type === "use" && !val && this.getIsPermExists(item, "edit")) {
        this.value.update((v) => ({
          ...v,
          [permCode + ".edit"]: false,
        }));
      }
    }

    // 하위 권한을 함께 변경함
    if (item.children) {
      for (const child of item.children) {
        this.onPermCheckChange(child, type, val);
      }
    }
  }

  #getDepthLength(items: ISdPermission[], depth: number): number {
    return (
      items.max((item) => {
        if (item.children) {
          return this.#getDepthLength(item.children, depth + 1);
        } else {
          return depth + 1;
        }
      }) ?? depth
    );
  }

  protected readonly itemTemplateType!: {
    item: ISdPermission;
    parentKey: string;
    depth: number;
    parent: ISdPermission | undefined;
  };
}
