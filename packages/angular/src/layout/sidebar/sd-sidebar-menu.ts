import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from "@angular/core";
import { injectFullPageCodeSignal } from "../../core/routing/injectFullPageCodeSignal";
import {
  type SdMenu,
  getMenuRouterLinkOption as menuRouterLinkOption,
  getIsMenuSelected as menuIsSelected,
} from "../../core/routing/menu-utils";
import { NgTemplateOutlet } from "@angular/common";
import { SdTypedTemplate } from "../../core/template/sd-typed-template";
import { SdRouterLink } from "../../core/routing/sd-router-link";
import { SdList } from "../../controls/list/sd-list";
import { SdListItem } from "../../controls/list/sd-list-item";
import { NgIcon } from "@ng-icons/core";

@Component({
  selector: "sd-sidebar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgTemplateOutlet,
    SdTypedTemplate,
    SdRouterLink,
    SdList,
    SdListItem,
    NgIcon,
  ],
  host: {
    "class": "flex-column fill",
    "[attr.data-sd-root-layout]": "rootLayout()",
  },
  template: `
    <div class="control-header p-default"><b>MENU</b></div>

    <sd-list class="flex-fill" [inset]="true">
      <ng-template
        [ngTemplateOutlet]="itemTpl"
        [ngTemplateOutletContext]="{ menus: menus(), depth: 0 }"
      ></ng-template>
    </sd-list>

    <ng-template #itemTpl [typed]="itemTemplateType" let-currMenus="menus" let-depth="depth">
      @for (menu of currMenus; track menu.codeChain.join(".")) {
        <sd-list-item
          [sdRouterLink]="getMenuRouterLinkOption(menu)"
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
      sd-sidebar-menu {
        > sd-list[data-sd-inset="true"] {
          sd-list {
            background: var(--trans-lightest);
          }
        }

        &:not([data-sd-root-layout="accordion"]) {
          > sd-list[data-sd-inset="true"] > sd-list-item > sd-collapse > ._content > ._children > sd-list {
            background: transparent;
          }
        }
      }
    `,
  ],
})
export class SdSidebarMenu {
  menus = input<SdMenu[]>([]);
  layout = input<"accordion" | "flat">();
  getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();

  fullPageCode = injectFullPageCodeSignal();

  rootLayout = computed(() => this.layout() ?? (this.menus().length <= 3 ? "flat" : "accordion"));

  getMenuRouterLinkOption(
    menu: SdMenu,
  ): { link: string; queryParams: Record<string, string> | undefined } | undefined {
    return menuRouterLinkOption(menu);
  }

  getIsMenuSelected(menu: SdMenu): boolean {
    return menuIsSelected(menu, this.fullPageCode(), this.getMenuIsSelectedFn());
  }

  onMenuClick(menu: SdMenu): void {
    if (menu.url != null) {
      window.open(menu.url, "_blank");
    }
  }

  protected readonly itemTemplateType!: {
    menus: SdMenu[];
    depth: number;
  };
}
