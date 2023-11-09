import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  EventEmitter,
  inject,
  Injector,
  Input,
  Output
} from "@angular/core";
import {SdAnchorControl} from "./SdAnchorControl";
import {ISdPermission} from "../utils/SdAppStructureUtil";
import {coercionBoolean} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {faChevronRight} from "@fortawesome/pro-duotone-svg-icons";
import {SdTypedTemplateDirective} from "../directives/SdTypedTemplateDirective";
import {NgForOf, NgIf, NgTemplateOutlet} from "@angular/common";
import {SdCollapseIconControl} from "./SdCollapseIconControl";
import {SdCheckboxControl} from "./SdCheckboxControl";

@Component({
  selector: "sd-permission-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdAnchorControl,
    SdTypedTemplateDirective,
    NgForOf,
    NgTemplateOutlet,
    SdCollapseIconControl,
    SdCheckboxControl,
    NgIf
  ],
  template: `
    <table>
      <tbody>
      <ng-container *ngFor="let item of items; trackBy: trackByForItem;">
          <ng-template [ngTemplateOutlet]="itemTemplate"
                 [ngTemplateOutletContext]="{item: item, parentKey: 'root', depth: 0, parent: undefined}">
          </ng-template>
      </ng-container>
      </tbody>
    </table>

    <ng-template #itemTemplate [typed]="itemTemplateType" let-item="item" let-parentKey="parentKey" let-depth="depth"
                 let-parent="parent">
      <tr [attr.sd-collapse]="!!parent && getIsPermCollapsed(parent)"
          [attr.sd-theme]="depth === 0 ? 'first' : depth % 3 === 0 ? 'success' : depth % 3 === 1 ? 'info' : 'warning'">
        <ng-container *ngFor="let _ of arr(depth + 1); let i = index; trackBy: trackByIndex">
          <td class="_before">
            &nbsp;
          </td>
        </ng-container>

        <td class="_title">
          <ng-container *ngIf="item.children && item.children.length > 0">
            <sd-anchor (click)="onPermCollapseToggle(item)">
              <sd-collapse-icon [icon]="faChevronRight" [open]="getIsPermCollapsed(item)"/>
              {{item.title}}
            </sd-anchor>
          </ng-container>
          <ng-container *ngIf="!item.children || item.children.length === 0">
            <div style="padding-left: 14px;">
              {{item.title}}
            </div>
          </ng-container>
        </td>

        <ng-container *ngFor="let _ of arr(depthLength - (depth + 1)); trackBy: trackByIndex">
          <td class="_after">
            &nbsp;
          </td>
        </ng-container>

        <td class="_after">
          <ng-container *ngIf="getIsPermExists(item, 'use')">
            <sd-checkbox inline
                         [value]="getIsPermChecked(item, 'use')"
                         (valueChange)="onPermCheckChange(item, 'use', $event)"
                         [disabled]="disabled">
              사용
            </sd-checkbox>
          </ng-container>
        </td>


        <td class="_after">
          <ng-container *ngIf="getIsPermExists(item, 'edit')">
            <sd-checkbox inline
                         [value]="getIsPermChecked(item, 'edit')"
                         (valueChange)="onPermCheckChange(item, 'edit', $event)"
                         [disabled]="disabled || (getIsPermExists(item, 'use') && !getIsPermChecked(item, 'use'))">
              편집
            </sd-checkbox>
          </ng-container>
        </td>
      </tr>
      <ng-container *ngIf="item.children && item.children.length > 0">
        <ng-container *ngFor="let child of item.children; trackBy: trackByForItem">
          <ng-template [ngTemplateOutlet]="itemTemplate"
                       [ngTemplateOutletContext]="{ item: child, parentKey: parentKey + '_' + item.codes.join('.'), depth: depth + 1, parent: item}">
          </ng-template>
        </ng-container>
      </ng-container>
    </ng-template>`,
  styles: [/* language=SCSS */ `
    :host {
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
              color: var(--text-trans-default);
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
                  color: var(--text-trans-rev-default);
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
  `]
})
export class SdPermissionTableControl implements DoCheck {
  @Input()
  items: ISdPermission[] = [];

  @Input()
  value: Record<string, boolean> = {};

  @Output()
  valueChange = new EventEmitter<this["value"]>();

  @Input({transform: coercionBoolean})
  disabled = false;

  collapsedItems = new Set<ISdPermission>();
  depthLength = 0;

  trackByForItem = (i: number, item: ISdPermission): string => item.codes.join(".");
  trackByIndex = <T>(i: number, item: T): number => i;

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheck(run => {
      run({
        items: [this.items, "all"]
      }, () => {
        this.depthLength = this.#getDepthLength(this.items, 0);
      });
    });
  }

  arr(len: number): number[] {
    return Array(len).fill(0);
  }

  getIsPermCollapsed(item: ISdPermission): boolean {
    return this.collapsedItems.has(item);
  }

  getAllChildren(item: ISdPermission): ISdPermission[] {
    return item.children?.mapMany((child) => [
      child,
      ...this.getAllChildren(child)
    ]) ?? [];
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
    if (item === undefined) {
      return true;
    }

    if (item.perms) {
      const permCode = item.codes.join(".");
      return this.value[permCode + "." + type] ?? false;
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
    if (this.collapsedItems.has(item)) {
      this.collapsedItems.delete(item);
    }
    else {
      this.collapsedItems.add(item);
      const allChildren = this.getAllChildren(item);
      for (const allChild of allChildren) {
        this.collapsedItems.add(allChild);
      }
    }
  }

  onPermCheckChange(item: ISdPermission, type: "use" | "edit", val: boolean) {
    if (item.perms) {
      const permCode = item.codes.join(".");

      if (type === "edit" && val && !this.getIsPermChecked(item, "use")) {
      }
      else {
        this.value[permCode + "." + type] = val;
      }

      // USE권한 지우면 EDIT권한도 자동으로 지움
      if (type === "use" && !val && this.getIsPermExists(item, "edit")) {
        this.value[permCode + ".edit"] = false;
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
    return items.max((item) => {
      if (item.children) {
        return this.#getDepthLength(item.children, depth + 1);
      }
      else {
        return depth + 1;
      }
    }) ?? depth;
  }

  protected readonly itemTemplateType!: {
    item: ISdPermission;
    parentKey: string;
    depth: number;
    parent: ISdPermission | undefined;
  };

  protected readonly faChevronRight = faChevronRight;
}