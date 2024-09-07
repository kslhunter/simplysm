import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, ViewEncapsulation } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { SdListControl } from "./SdListControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdTypedTemplateDirective } from "../directives/SdTypedTemplateDirective";
import { SdListItemControl } from "./SdListItemControl";
import { SdIconControl } from "./SdIconControl";
import { SdRouterLinkDirective } from "../directives/SdRouterLinkDirective";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { sdGetter, sdInit, TSdGetter } from "../utils/hooks";

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
    SdRouterLinkDirective,
  ],
  template: `
    @if (rootLayout === "accordion") {
      <h5 class="_title">MENU</h5>
    }
    <sd-list inset>
      <ng-template
        [ngTemplateOutlet]="itemTemplate"
        [ngTemplateOutletContext]="{ menus: menus, depth: 0 }"
      ></ng-template>
    </sd-list>
    <ng-template #itemTemplate [typed]="itemTemplateType" let-currMenus="menus" let-depth="depth">
      @for (menu of currMenus; track menu.codeChain.join(".")) {
        <!--[contentStyle]="'padding-left: ' + ((depth + 1) * 6) + 'px'"-->
        <sd-list-item
          [contentClass]="depth === 0 ? 'pv-default' : ''"
          [sdRouterLink]="menu.children || menu.url ? undefined : ['/home/' + menu.codeChain.join('/')]"
          (click)="onMenuClick(menu)"
          [selected]="getIsMenuSelected(menu)"
          [layout]="depth === 0 ? rootLayout : 'accordion'"
        >
          @if (menu.icon) {
            <sd-icon [icon]="menu.icon" fixedWidth />
            &nbsp;
          }
          {{ menu.title }}
          @if (menu.children) {
            <sd-list inset [style.padding-left]="(depth + 1 - (rootLayout === 'accordion' ? 0 : 1)) * 6 + 'px'">
              <ng-template
                [ngTemplateOutlet]="itemTemplate"
                [ngTemplateOutletContext]="{
                  menus: menu.children,
                  depth: depth + 1,
                }"
              ></ng-template>
            </sd-list>
          }
        </sd-list-item>
      }
    </ng-template>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-sidebar-menu {
        > ._title {
          padding: var(--gap-xs) var(--gap-sm);
          margin: 0 var(--gap-sm);
          color: var(--text-trans-lighter);
          font-size: var(--font-size-sm);
        }

        > sd-list[sd-inset="true"] {
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
            background: rgba(0, 0, 0, 0.03);
            border-top-left-radius: var(--border-radius-default);
            border-bottom-left-radius: var(--border-radius-default);
          }
        }

        &:not([sd-root-layout="accordion"]) {
          > sd-list[sd-inset="true"] > sd-list-item > sd-collapse > ._content > sd-list {
            background: transparent;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-root-layout]": "rootLayout",
  },
})
export class SdSidebarMenuControl {
  #router = inject(Router);
  #cdr = inject(ChangeDetectorRef);

  @Input() menus: ISdSidebarMenuVM[] = [];
  @Input() layout?: "accordion" | "flat";
  @Input() getMenuIsSelectedGetter?: TSdGetter<(menu: ISdSidebarMenuVM) => boolean>;

  #pageCode = "";

  get rootLayout(): "flat" | "accordion" {
    return this.layout ?? (this.menus.length <= 3 ? "flat" : "accordion");
  }

  constructor() {
    sdInit(this, () => {
      this.#pageCode = this.#router.url
        .split("/")
        .slice(2)
        .map((item) => item.split(";").first())
        .join(".");

      this.#router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.#pageCode = this.#router.url
            .split("/")
            .slice(2)
            .map((item) => item.split(";").first())
            .join(".");
          this.#cdr.markForCheck();
        }
      });
    });
  }

  getIsMenuSelected = sdGetter(this,
    async () => ({
      pageCode: [this.#pageCode],
      ...(await this.getMenuIsSelectedGetter?.getCheckDataAsync("getMenuIsSelectedGetter")),
    }),
    (menu: ISdSidebarMenuVM) => {
      return this.getMenuIsSelectedGetter
        ? this.getMenuIsSelectedGetter(menu)
        : this.#pageCode === menu.codeChain.join(".");
    },
  );

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
