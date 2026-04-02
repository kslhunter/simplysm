import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from "@angular/core";
import { useFullPageCodeSignal } from "../../../core/utils/useFullPageCodeSignal";
import {
  type ISdMenu,
  getMenuRouterLinkOption as menuRouterLinkOption,
  getIsMenuSelected as menuIsSelected,
} from "../menu-utils";
import { NgTemplateOutlet } from "@angular/common";
import { SdTypedTemplateDirective } from "../../../core/directives/sd-typed-template.directive";
import { SdRouterLinkDirective } from "../../../core/directives/sd-router-link.directive";
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
          [style.padding-left.em]="depth > 0 ? (depth + 1) * 0.5 : undefined"
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
      sd-sidebar-menu {
        > sd-list[data-sd-inset="true"] {
          sd-list {
            background: var(--trans-lightest);
          }

          > sd-list-item > ._content {
            padding-block: var(--gap-default);
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
  menus = input<ISdMenu[]>([]);
  layout = input<"accordion" | "flat">();
  getMenuIsSelectedFn = input<(menu: ISdMenu) => boolean>();

  fullPageCode = useFullPageCodeSignal();

  rootLayout = computed(() => this.layout() ?? (this.menus().length <= 3 ? "flat" : "accordion"));

  getMenuRouterLinkOption(
    menu: ISdMenu,
  ): { link: string; queryParams: Record<string, string> | undefined } | undefined {
    return menuRouterLinkOption(menu);
  }

  getIsMenuSelected(menu: ISdMenu): boolean {
    return menuIsSelected(menu, this.fullPageCode(), this.getMenuIsSelectedFn());
  }

  onMenuClick(menu: ISdMenu): void {
    if (menu.url != null) {
      window.open(menu.url, "_blank");
    }
  }

  protected readonly itemTemplateType!: {
    menus: ISdMenu[];
    depth: number;
  };
}
