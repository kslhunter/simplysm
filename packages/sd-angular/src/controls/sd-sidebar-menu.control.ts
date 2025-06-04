import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { useFullPageCodeSignal } from "../utils/signals/use-full-page-code.signal";
import { SdListControl } from "./sd-list.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdTypedTemplateDirective } from "../directives/sd-typed.template-directive";
import { SdListItemControl } from "./sd-list-item.control";
import { SdRouterLinkDirective } from "../directives/sd-router-link.directive";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { SdIconControl } from "./icon/sd-icon.control";
import * as querystring from "querystring";
import { $computed } from "../utils/bindings/$computed";

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
    SdRouterLinkDirective,
    SdIconControl,
  ],
  template: `
    @if (rootLayout() === "accordion") {
      <h5 class="_title">MENU</h5>
    }
    <sd-list [inset]="true">
      <ng-template
        [ngTemplateOutlet]="itemTemplate"
        [ngTemplateOutletContext]="{ menus: menus(), depth: 0 }"
      ></ng-template>
    </sd-list>
    <ng-template #itemTemplate [typed]="itemTemplateType" let-currMenus="menus" let-depth="depth">
      @for (menu of currMenus; track menu.codeChain.join(".")) {
        <!--[contentStyle]="'padding-left: ' + ((depth + 1) * 6) + 'px'"-->
        <sd-list-item
          [contentClass]="depth === 0 ? 'pv-default' : ''"
          [sd-router-link]="getMenuRouterLinkOption(menu)"
          (click)="onMenuClick(menu)"
          [selected]="getIsMenuSelected(menu)"
          [layout]="depth === 0 ? rootLayout() : 'accordion'"
        >
          @if (menu.icon) {
            <sd-icon [icon]="menu.icon" fixedWidth />
            &nbsp;
          }
          {{ menu.title }}
          @if (menu.children) {
            <sd-list
              [inset]="true"
              [style.padding-left]="(depth + 1 - (rootLayout() === 'accordion' ? 0 : 1)) * 6 + 'px'"
            >
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
      @use "../scss/mixins";

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
    "[attr.sd-root-layout]": "rootLayout()",
  },
})
export class SdSidebarMenuControl {
  menus = input<ISdSidebarMenu[]>([]);
  layout = input<"accordion" | "flat">();
  getMenuIsSelectedFn = input<(menu: ISdSidebarMenu) => boolean>();

  fullPageCode = useFullPageCodeSignal();

  rootLayout = $computed(() => this.layout() ?? (this.menus().length <= 3 ? "flat" : "accordion"));

  getMenuRouterLinkOption(menu: ISdSidebarMenu) {
    if (menu.children || menu.url != null) {
      return undefined;
    }

    const relNav = menu.codeChain.join("/");
    const n = relNav.split("?")[0];
    const q = relNav.split("?")[1] as string | undefined;
    const qp = q == null ? undefined : querystring.parse(q);

    return {
      link: "/home/" + n,
      queryParams: qp,
    };
  }

  getIsMenuSelected(menu: ISdSidebarMenu) {
    return this.getMenuIsSelectedFn()
      ? this.getMenuIsSelectedFn()!(menu)
      : this.fullPageCode() === menu.codeChain.join(".");
  }

  onMenuClick(menu: ISdSidebarMenu): void {
    if (menu.url != null) {
      window.open(menu.url, "_blank");
    }
  }

  protected readonly itemTemplateType!: {
    menus: ISdSidebarMenu[];
    depth: number;
  };
}

export interface ISdSidebarMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: IconDefinition;
  children?: ISdSidebarMenu[];
}
