import {
  ChangeDetectionStrategy,
  Component,
  input,
  viewChildren,
  ViewEncapsulation,
} from "@angular/core";
import { injectFullPageCodeSignal } from "../../core/routing/injectFullPageCodeSignal";
import {
  type SdMenu,
  getMenuRouterLinkOption as menuRouterLinkOption,
  getIsMenuSelected as menuIsSelected,
} from "../../core/routing/menu-utils";
import { NgTemplateOutlet } from "@angular/common";
import { SdTypedTemplate } from "../../core/template/sd-typed-template";
import { SdRouterLink } from "../../core/routing/sd-router-link";
import { SdDropdown } from "../../controls/dropdown/sd-dropdown";
import { SdDropdownPopup } from "../../controls/dropdown/sd-dropdown-popup";
import { SdList } from "../../controls/list/sd-list";
import { SdListItem } from "../../controls/list/sd-list-item";
import { SdButton } from "../../controls/button/sd-button";
import { NgIcon } from "@ng-icons/core";
import { tablerCaretDown } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgTemplateOutlet,
    SdTypedTemplate,
    SdRouterLink,
    SdDropdown,
    SdDropdownPopup,
    SdList,
    SdListItem,
    SdButton,
    NgIcon,
  ],
  host: {
    "class": "flex-row gap-sm",
  },
  template: `
    @for (menu of menus(); track menu.codeChain.join("."); let i = $index) {
      <sd-dropdown>
        <sd-button [theme]="'link-gray'">
          @if (menu.icon) {
            <ng-icon [svg]="menu.icon" />
          }
          {{ menu.title }}
          <ng-icon [svg]="tablerCaretDown" />
        </sd-button>
        <sd-dropdown-popup>
          <sd-list [inset]="true">
            @if (menu.children) {
              <ng-template
                [ngTemplateOutlet]="itemTpl"
                [ngTemplateOutletContext]="{ menus: menu.children, depth: 0, dropdownIndex: i }"
              ></ng-template>
            } @else {
              <ng-template
                [ngTemplateOutlet]="itemTpl"
                [ngTemplateOutletContext]="{ menus: [menu], depth: 0, dropdownIndex: i }"
              ></ng-template>
            }
          </sd-list>
        </sd-dropdown-popup>
      </sd-dropdown>
    }

    <ng-template
      #itemTpl
      [typed]="itemTemplateType"
      let-currMenus="menus"
      let-depth="depth"
      let-dropdownIndex="dropdownIndex"
    >
      @for (menu of currMenus; track menu.codeChain.join(".")) {
        <sd-list-item
          [style.padding-left.em]="depth > 0 ? (depth + 1) * 0.5 : undefined"
          [style.padding-block]="depth === 0 ? 'var(--gap-default)' : undefined"
          [sdRouterLink]="getMenuRouterLinkOption(menu)"
          (click)="onMenuClick(menu, dropdownIndex)"
          [selected]="getIsMenuSelected(menu)"
          [open]="true"
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
                  dropdownIndex: dropdownIndex,
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
      sd-topbar-menu {
        sd-dropdown-popup {
          sd-list[data-sd-inset="true"] {
            sd-list {
              background: var(--trans-lightest);
            }
          }
        }
      }
    `,
  ],
})
export class SdTopbarMenu {
  menus = input<SdMenu[]>([]);
  getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();

  fullPageCode = injectFullPageCodeSignal();

  private readonly _dropdowns = viewChildren(SdDropdown);

  getMenuRouterLinkOption(
    menu: SdMenu,
  ): { link: string; queryParams: Record<string, string> | undefined } | undefined {
    return menuRouterLinkOption(menu);
  }

  getIsMenuSelected(menu: SdMenu): boolean {
    return menuIsSelected(menu, this.fullPageCode(), this.getMenuIsSelectedFn());
  }

  onMenuClick(menu: SdMenu, dropdownIndex: number): void {
    if (menu.url != null) {
      window.open(menu.url, "_blank");
    }

    if (menu.children === undefined) {
      this._dropdowns()[dropdownIndex].open.set(false);
    }
  }

  protected readonly itemTemplateType!: {
    menus: SdMenu[];
    depth: number;
    dropdownIndex: number;
  };

  protected readonly tablerCaretDown = tablerCaretDown;
}
