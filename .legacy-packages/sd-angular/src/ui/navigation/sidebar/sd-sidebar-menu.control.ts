import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { useFullPageCodeSignal } from "../../../core/utils/signals/useFullPageCodeSignal";
import { NgTemplateOutlet } from "@angular/common";
import { SdTypedTemplateDirective } from "../../../core/directives/sd-typed-template.directive";
import { SdRouterLinkDirective } from "../../../core/directives/sd-router-link.directive";
import * as querystring from "querystring";
import { $computed } from "../../../core/utils/bindings/$computed";
import { SdListControl } from "../../data/list/sd-list.control";
import { SdListItemControl } from "../../data/list/sd-list-item.control";
import { NgIcon } from "@ng-icons/core";

@Component({
  selector: "sd-sidebar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    SdRouterLinkDirective,
    SdListControl,
    SdListItemControl,
    NgIcon,
  ],
  host: {
    "class": "flex-column fill",
    "[attr.data-sd-root-layout]": "rootLayout()",
  },
  template: `
    <div class="control-header p-default">MENU</div>

    <sd-list class="flex-fill" [inset]="true">
      <ng-template
        [ngTemplateOutlet]="itemTpl"
        [ngTemplateOutletContext]="{ menus: menus(), depth: 0 }"
      ></ng-template>
    </sd-list>

    <ng-template #itemTpl [typed]="itemTemplateType" let-currMenus="menus" let-depth="depth">
      @for (menu of currMenus; track menu.codeChain.join(".")) {
        <sd-list-item
          [contentClass]="depth === 0 ? 'pv-default' : ''"
          [contentStyle]="depth != 0 ? 'text-indent: ' + (depth + 1) * 0.5 + 'em' : undefined"
          [sd-router-link]="getMenuRouterLinkOption(menu)"
          (click)="onMenuClick(menu)"
          [selected]="getIsMenuSelected(menu)"
          [layout]="depth === 0 ? rootLayout() : 'accordion'"
        >
          @if (menu.icon) {
            <ng-icon [svg]="menu.icon" />
            &nbsp;
          }
          {{ menu.title }}
          @if (menu.children) {
            <sd-list [inset]="true">
              <ng-template
                [ngTemplateOutlet]="itemTpl"
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
      @use "../../../../scss/commons/mixins";

      sd-sidebar-menu {
        > sd-list[data-sd-inset="true"] {
          sd-list {
            background: var(--trans-lightest);
          }
        }

        &:not([data-sd-root-layout="accordion"]) {
          > sd-list[data-sd-inset="true"] > sd-list-item > sd-collapse > ._content > sd-list {
            background: transparent;
          }
        }
      }
    `,
  ],
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
  icon?: string;
  children?: ISdSidebarMenu[];
}
