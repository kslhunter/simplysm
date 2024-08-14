import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnInit,
  ViewEncapsulation
} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {TSdFnInfo} from "../utils/commons";
import {SdListControl} from "./SdListControl";
import {NgTemplateOutlet} from "@angular/common";
import {SdTypedTemplateDirective} from "../directives/SdTypedTemplateDirective";
import {SdListItemControl} from "./SdListItemControl";
import {SdIconControl} from "./SdIconControl";
import {SdRouterLinkDirective} from "../directives/SdRouterLinkDirective";
import {IconProp} from "@fortawesome/fontawesome-svg-core";

@Component({
  selector: "sd-sidebar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdListControl,
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    SdListItemControl,
    SdIconControl,
    SdRouterLinkDirective
  ],
  template: `
    @if (getRootLayout() === "accordion") {
      <h5 class="_title">MENU</h5>
    }
    <sd-list inset>
      <ng-template [ngTemplateOutlet]="itemTemplate"
                   [ngTemplateOutletContext]="{menus: menus, depth: 0}"></ng-template>
    </sd-list>
    <ng-template #itemTemplate [typed]="itemTemplateType" let-currMenus="menus" let-depth="depth">
      @for (menu of currMenus; track menu.codeChain.join('.')) {
        <!--[contentStyle]="'padding-left: ' + ((depth + 1) * 6) + 'px'"-->
        <sd-list-item [contentClass]="depth === 0 ? 'pv-default' : ''"
                      [sdRouterLink]="(menu.children || menu.url) ? undefined: ['/home/' + menu.codeChain.join('/')]"
                      (click)="onMenuClick(menu)"
                      [selected]="getIsMenuSelected(menu)"
                      [layout]="depth === 0 ? getRootLayout() : 'accordion'">
          @if (menu.icon) {
            <sd-icon [icon]="menu.icon" fixedWidth/>&nbsp;
          }
          {{ menu.title }}
          @if (menu.children) {
            <sd-list inset [style.padding-left]="((depth + 1) * 6) + 'px'">
              <ng-template [ngTemplateOutlet]="itemTemplate"
                           [ngTemplateOutletContext]="{menus: menu.children, depth: depth + 1}"></ng-template>
            </sd-list>
          }
        </sd-list-item>
      }
    </ng-template>`,
  styles: [/* language=SCSS */ `
    sd-sidebar-menu {
      > ._title {
        padding: var(--gap-xs) var(--gap-sm);
        margin: 0 var(--gap-sm);
        color: var(--text-trans-lighter);
        font-size: var(--font-size-sm);
      }

      > sd-list[sd-inset=true] {
        //padding: 0 var(--gap-default);
        padding-left: var(--gap-default);

        sd-list-item {
          > ._content {
            margin-right: 0;
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
          }

          > ._child {
            margin-right: 0;
          }
        }

        sd-list {
          background: rgba(0, 0, 0, .03);
          border-top-left-radius: var(--border-radius-default);
          border-bottom-left-radius: var(--border-radius-default);
        }
      }
    }
  `]
})
export class SdSidebarMenuControl implements OnInit {
  #router = inject(Router);
  #cdr = inject(ChangeDetectorRef);

  @Input() menus: ISdSidebarMenuVM[] = [];
  @Input() layout?: "accordion" | "flat";
  @Input() getMenuIsSelectedFn?: TSdFnInfo<(menu: ISdSidebarMenuVM) => boolean>;

  #pageCode = "";

  getRootLayout(): "flat" | "accordion" {
    return this.layout ?? (this.menus.length <= 3 ? 'flat' : 'accordion');
  }

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