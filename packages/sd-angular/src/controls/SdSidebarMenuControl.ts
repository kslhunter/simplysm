import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnInit} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {TSdFnInfo} from "../utils/commons";
import {SdListControl} from "./SdListControl";
import {NgForOf, NgIf, NgTemplateOutlet} from "@angular/common";
import {SdTypedTemplateDirective} from "../directives/SdTypedTemplateDirective";
import {SdListItemControl} from "./SdListItemControl";
import {SdIconControl} from "./SdIconControl";
import {SdRouterLinkDirective} from "../directives/SdRouterLinkDirective";
import {IconProp} from "@fortawesome/fontawesome-svg-core";

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
    <h5 class="_title">MENUS</h5>
    <sd-list inset>
      <ng-template [ngTemplateOutlet]="itemTemplate"
                   [ngTemplateOutletContext]="{menus: menus, depth: 0}"></ng-template>
    </sd-list>
    <ng-template #itemTemplate [typed]="itemTemplateType" let-currMenus="menus" let-depth="depth">
      <ng-container *ngFor="let menu of currMenus; trackBy: trackByForMenu;">
        <sd-list-item [contentClass]="depth === 0 ? 'pv-default' : ''"
                      [contentStyle]="'padding-left: ' + ((depth + 1) * 6) + 'px'"
                      [sdRouterLink]="(menu.children || menu.url) ? undefined: ['/home/' + menu.codeChain.join('/')]"
                      (click)="onMenuClick(menu)"
                      [selected]="getIsMenuSelected(menu)"
                      [layout]="depth === 0 ? (layout ?? 'accordion') : 'accordion'">
          <sd-icon *ngIf="menu.icon" [icon]="menu.icon" fixedWidth/>
          {{ menu.title }}
          <sd-list *ngIf="menu.children" inset>
            <ng-template [ngTemplateOutlet]="itemTemplate"
                         [ngTemplateOutletContext]="{menus: menu.children, depth: depth + 1}"></ng-template>
          </sd-list>
        </sd-list-item>
      </ng-container>
    </ng-template>`,
  styles: [/* language=SCSS */ `
    :host {
      > ._title {
        body.sd-theme-compact & {
          display: none;
        }

        body.sd-theme-modern &,
        body.sd-theme-kiosk &,
        body.sd-theme-mobile & {
          padding: var(--gap-xs) var(--gap-sm);
          margin: 0 var(--gap-sm);
          color: var(--text-trans-lighter);
          font-size: var(--font-size-sm);
        }
      }

      ::ng-deep > sd-list[sd-inset=true] {
        body.sd-theme-modern &,
        body.sd-theme-kiosk &,
        body.sd-theme-mobile & {
          padding: 0 var(--gap-default);
        }
      }
    }
  `]
})
export class SdSidebarMenuControl implements OnInit {
  #router = inject(Router);
  #cdr = inject(ChangeDetectorRef);

  @Input()
  menus: ISdSidebarMenuVM[] = [];

  @Input()
  layout?: "accordion" | "flat";

  @Input()
  getMenuIsSelectedFn?: TSdFnInfo<(menu: ISdSidebarMenuVM) => boolean>;

  trackByForMenu = (i: number, menu: ISdSidebarMenuVM): string => menu.codeChain.join(".");

  #pageCode = "";

  ngOnInit(): void {
    this.#pageCode = this.#router.url.split("/").slice(2).map((item) => item.split(";").first()).join(".");

    this.#router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.#pageCode = this.#router.url.split("/").slice(2).map((item) => item.split(";").first()).join(".");
        this.#cdr.markForCheck();
      }
    });
  }

  getIsMenuSelected(menu: ISdSidebarMenuVM): boolean {
    return this.getMenuIsSelectedFn?.[0]
      ? this.getMenuIsSelectedFn[0](menu)
      : this.#pageCode === menu.codeChain.join(".");
  }

  onMenuClick(menu: ISdSidebarMenuVM): void {
    if (menu.url != null) {
      window.open(menu.url, "_blank");
    }
  }


  protected readonly itemTemplateType!: {
    menus: ISdSidebarMenuVM[];
    depth: number;
  };
}

export interface ISdSidebarMenuVM {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: IconProp;
  children?: ISdSidebarMenuVM[];
}