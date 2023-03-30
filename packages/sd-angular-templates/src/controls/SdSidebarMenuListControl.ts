import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ISdAppStructureItem, ISdMenu, SdAppStructureUtil } from "@simplysm/sd-angular";
import { Router } from "@angular/router";

@Component({
  selector: "sd-sidebar-menu-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-list inset>
      <ng-container *ngFor="let menu of menus; trackBy: trackByFnForMenu">
        <ng-template [ngTemplateOutletContext]="{ menu: menu, depth: 0 }"
                     [ngTemplateOutlet]="itemListTemplate"></ng-template>
      </ng-container>

      <ng-template #itemListTemplate let-menu="menu" let-depth="depth">
        <sd-list-item [content.class]="'sd-padding-' + (!depth ? 'default' : 'sm') + '-default'"
                      [sdRouterLink]="!menu.children ? ['/home/' + menu.codeChain.join('/')] : undefined"
                      [selected]="getIsCurrentPageMenu(menu)"
                      [layout]="depth === 0 && menus.length < 5 ? 'flat' : 'accordion'">
          <sd-gap [width.px]="menus.length < 5 ? 0 : (6 * depth)"></sd-gap>
          <fa-icon *ngIf="menu.icon" [icon]="menu.icon" [fixedWidth]="true"></fa-icon>
          {{ menu.title }}

          <sd-list *ngIf="menu.children && menu.children.length > 0">
            <ng-container *ngFor="let childMenu of menu.children; trackBy: trackByFnForMenu">
              <ng-template [ngTemplateOutletContext]="{ menu: childMenu, depth: depth + 1 }"
                           [ngTemplateOutlet]="itemListTemplate"></ng-template>
            </ng-container>
          </sd-list>
        </sd-list-item>
      </ng-template>
    </sd-list>`
})
export class SdSidebarMenuListControl {
  public appStructureItems: ISdAppStructureItem[] = [];
  public checkPermissionFn = (code: string): boolean => true;
  public checkUsableModuleFn = (moduleName: string): boolean => true;

  public menus: ISdMenu[] = [];

  public trackByFnForMenu = (i: number, item: ISdMenu): string => item.title;

  public getIsCurrentPageMenu(menu: ISdMenu): boolean {
    const pageCode = this._router.url.split("/").slice(2).map((item) => item.split(";").first()).join(".");
    return pageCode === menu.codeChain.join(".");
  }

  public constructor(private readonly _router: Router) {
    this.menus = this._getDisplayMenus();
  }

  private _getDisplayMenus(menus?: ISdMenu[]): ISdMenu[] {
    const result: ISdMenu[] = [];

    for (const menu of (menus ?? SdAppStructureUtil.getMenus(this.appStructureItems))) {
      if ("children" in menu) {
        if (this._isUsableModuleMenu(menu)) {
          const children = this._getDisplayMenus(menu.children);
          if (children.length > 0) {
            result.push({ ...menu, children });
          }
        }
      }
      else {
        const code = menu.codeChain.join(".");
        if (
          (!menu.hasPerms || this.checkPermissionFn(code))
          && this._isUsableModuleMenu(menu)
        ) {
          result.push(menu);
        }
      }
    }

    return result;
  }


  private _isUsableModuleMenu(menu: ISdMenu): boolean {
    if (!menu.modules) {
      return true;
    }

    for (const moduleName of menu.modules) {
      if (this.checkUsableModuleFn(moduleName)) {
        return true;
      }
    }

    return false;
  }
}
