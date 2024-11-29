import { ChangeDetectionStrategy, Component, inject, input, output, ViewEncapsulation } from "@angular/core";
import { SdAnchorControl } from "./SdAnchorControl";
import { ISdPermission } from "../utils/SdAppStructureUtil";
import { SdTypedTemplateDirective } from "../directives/SdTypedTemplateDirective";
import { NgTemplateOutlet } from "@angular/common";
import { SdCollapseIconControl } from "./SdCollapseIconControl";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { $computed, $model, $signal } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";
import { ObjectUtil } from "@simplysm/sd-core-common";

/**
 * 권한 테이블 컨트롤
 *
 * 계층형 권한 구조를 테이블 형태로 표시하고 관리하는 컴포넌트
 *
 * @example
 *
 * <sd-permission-table
 *   [items]="permissions"
 *   [(value)]="selectedPermissions"
 *   [disabled]="isDisabled">
 *   <ng-template #titleTemplate let-item="item">
 *     {{ item.title }}
 *   </ng-template>
 * </sd-permission-table>
 *
 *
 * @remarks
 * - 계층형 구조의 권한을 표시하고 관리할 수 있습니다
 * - 체크박스를 통해 권한을 선택/해제할 수 있습니다
 * - 상위 권한 선택 시 하위 권한이 자동으로 선택됩니다
 * - 접기/펼치기 기능을 통해 하위 권한을 숨기거나 표시할 수 있습니다
 */
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
  /** 아이콘 설정 */
  icons = inject(SdAngularConfigProvider).icons;

  /** 권한 설정 값 */
  _value = input<Record<string, boolean>>({}, { alias: "value" });
  /** 권한 설정 값 변경 이벤트 */
  _valueChange = output<Record<string, boolean>>({ alias: "valueChange" });
  /** 권한 설정 값 모델 */
  value = $model(this._value, this._valueChange);

  /** 권한 목록 */
  items = input<ISdPermission[]>([]);
  /** 비활성화 여부 */
  disabled = input(false, { transform: transformBoolean });

  /** 접힌 아이템 목록 */
  collapsedItems = $signal(new Set<ISdPermission>());

  /** 최대 깊이 */
  depthLength = $computed(() => {
    return this.#getDepthLength(this.items(), 0);
  });

  /** 배열 생성 */
  arr(len: number): number[] {
    return Array(len).fill(0);
  }

  /** 아이템이 접혀있는지 여부 */
  getIsPermCollapsed(item: ISdPermission): boolean {
    return this.collapsedItems().has(item);
  }

  /** 모든 하위 아이템 가져오기 */
  getAllChildren(item: ISdPermission): ISdPermission[] {
    return item.children?.mapMany((child) => [child, ...this.getAllChildren(child)]) ?? [];
  }

  /** 편집 비활성화 여부 */
  getEditDisabled(item: ISdPermission) {
    if (this.disabled()) {
      return true;
    }

    if (item.perms) {
      if (this.getIsPermExists(item, "use") && !this.getIsPermChecked(item, "use")) {
        return true;
      }
    }
    else {
      if (item.children?.every((child) => !this.getIsPermExists(child, "edit") || this.getEditDisabled(child))) {
        return true;
      }
    }

    return false;
  }

  /** 권한이 존재하는지 여부 */
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

  /** 권한이 체크되어있는지 여부 */
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

  /** 권한 접기/펼치기 토글 */
  onPermCollapseToggle(item: ISdPermission) {
    this.collapsedItems.update((v) => {
      const r = new Set(v);
      if (r.has(item)) {
        r.delete(item);
      }
      else {
        r.add(item);
        const allChildren = this.getAllChildren(item);
        for (const allChild of allChildren) {
          r.add(allChild);
        }
      }
      return r;
    });
  }

  /** 권한 체크 변경 */
  onPermCheckChange(item: ISdPermission, type: "use" | "edit", val: boolean) {
    const value = ObjectUtil.clone(this.value());
    const changed = this.#changePermCheck(value, item, type, val);
    if (changed) {
      this.value.set(value);
    }
  }

  /** 권한 체크 변경 처리 */
  #changePermCheck(value: Record<string, boolean>, item: ISdPermission, type: "use" | "edit", val: boolean) {
    let changed = false;

    if (item.perms) {
      const permCode = item.codes.join(".");

      if (type === "edit" && val && !this.getIsPermChecked(item, "use")) {
      }
      else {
        if (this.getIsPermExists(item, type) && value[permCode + "." + type] !== val) {
          value[permCode + "." + type] = val;
          changed = true;
        }
      }

      // USE권한 지우면 EDIT권한도 자동으로 지움
      if (type === "use" && !val && this.getIsPermExists(item, "edit") && !value[permCode + ".edit"]) {
        value[permCode + ".edit"] = false;
        changed = true;
      }
    }

    // 하위 권한을 함께 변경함
    if (item.children) {
      for (const child of item.children) {
        const childChanged = this.#changePermCheck(value, child, type, val);
        if (childChanged) {
          changed = true;
        }
      }
    }

    return changed;
  }

  /** 최대 깊이 계산 */
  #getDepthLength(items: ISdPermission[], depth: number): number {
    return (
      items.max((item) => {
        if (item.children) {
          return this.#getDepthLength(item.children, depth + 1);
        }
        else {
          return depth + 1;
        }
      }) ?? depth
    );
  }

  /** 아이템 템플릿 타입 */
  protected readonly itemTemplateType!: {
    item: ISdPermission;
    parentKey: string;
    depth: number;
    parent: ISdPermission | undefined;
  };
}