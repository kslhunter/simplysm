import {ChangeDetectionStrategy, Component, inject, Input} from "@angular/core";
import {ISdMenu} from "../utils/SdAppStructureUtil";
import {Router} from "@angular/router";
import {TSdFnInfo} from "../utils/commons";
import {SdListControl} from "./SdListControl";
import {NgForOf, NgIf, NgTemplateOutlet} from "@angular/common";
import {SdTypedTemplateDirective} from "../directives/SdTypedTemplateDirective";
import {SdListItemControl} from "./SdListItemControl";
import {SdIconControl} from "./SdIconControl";
import {SdRouterLinkDirective} from "../directives/SdRouterLinkDirective";

@Component({
  selector: "sd-sidebar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdListControl,
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    SdListItemControl,
    NgForOf,
    SdIconControl,
    NgIf,
    SdRouterLinkDirective
  ],
  template: `
    <sd-list inset>
      <ng-template [ngTemplateOutlet]="itemTemplate"
                   [ngTemplateOutletContext]="{menus: menus, depth: 0}"></ng-template>
    </sd-list>
    <ng-template #itemTemplate [typed]="itemTemplateType" let-currMenus="menus" let-depth="depth">
      <ng-container *ngFor="let menu of currMenus; trackBy: trackByForMenu;">
        <sd-list-item [contentClass]="depth === 0 ? 'pv-default' : ''"
                      [contentStyle]="'padding-left: ' + ((depth + 1) * 6) + 'px'"
                      [sdRouterLink]="menu.children ? undefined: ['/home/' + menu.codeChain.join('/')]"
                      [selected]="getIsMenuSelected(menu)"
                      [layout]="depth === 0 ? (layout ?? 'accordion') : 'accordion'">
          <sd-icon *ngIf="menu.icon" [icon]="menu.icon" fixedWidth/>
          {{menu.title}}
          <sd-list *ngIf="menu.children" inset>
            <ng-template [ngTemplateOutlet]="itemTemplate"
                         [ngTemplateOutletContext]="{menus: menu.children, depth: depth + 1}"></ng-template>
          </sd-list>
        </sd-list-item>
      </ng-container>
    </ng-template>`
})
export class SdSidebarMenuControl {
  #router = inject(Router);

  @Input()
  menus: ISdMenu[] = [];

  @Input()
  layout?: "accordion" | "flat";

  @Input()
  getMenuIsSelectedFn?: TSdFnInfo<(menu: ISdMenu) => boolean>;

  trackByForMenu = (i: number, menu: ISdMenu): string => menu.codeChain.join(".");

  getIsMenuSelected(menu: ISdMenu): boolean {
    const pageCode = this.#router.url.split("/").slice(2).map((item) => item.split(";").first()).join(".");

    return this.getMenuIsSelectedFn?.[0]
      ? this.getMenuIsSelectedFn[0](menu)
      : pageCode === menu.codeChain.join(".");
  }

  protected readonly itemTemplateType!: {
    menus: ISdMenu[];
    depth: number;
  };
}