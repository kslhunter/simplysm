import {
  ChangeDetectionStrategy,
  Component,
  input,
  viewChildren,
  ViewEncapsulation,
} from "@angular/core";
import { useFullPageCodeSignal } from "../../../core/utils/useFullPageCodeSignal";
import {
  type ISdMenu,
  getMenuRouterLinkOption as menuRouterLinkOption,
  getIsMenuSelected as menuIsSelected,
} from "../menu-utils";
import { NgTemplateOutlet } from "@angular/common";
import { SdTypedTemplateDirective } from "../../../core/directives/sd-typed-template.directive";
import { SdRouterLinkDirective } from "../../../core/directives/sd-router-link.directive";
import { SdDropdownControl } from "../../overlay/dropdown/sd-dropdown.control";
import { SdDropdownPopupControl } from "../../overlay/dropdown/sd-dropdown-popup.control";
import { SdListControl } from "../../data/list/sd-list.control";
import { SdListItemControl } from "../../data/list/sd-list-item.control";
import { SdButtonControl } from "../../form/button/sd-button.control";
import { NgIcon } from "@ng-icons/core";
import { tablerCaretDown } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    SdRouterLinkDirective,
    SdDropdownControl,
    SdDropdownPopupControl,
    SdListControl,
    SdListItemControl,
    SdButtonControl,
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
          [sd-router-link]="getMenuRouterLinkOption(menu)"
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
export class SdTopbarMenuControl {
  menus = input<ISdMenu[]>([]);
  getMenuIsSelectedFn = input<(menu: ISdMenu) => boolean>();

  fullPageCode = useFullPageCodeSignal();

  private readonly _dropdowns = viewChildren(SdDropdownControl);

  getMenuRouterLinkOption(
    menu: ISdMenu,
  ): { link: string; queryParams: Record<string, string> | undefined } | undefined {
    return menuRouterLinkOption(menu);
  }

  getIsMenuSelected(menu: ISdMenu): boolean {
    return menuIsSelected(menu, this.fullPageCode(), this.getMenuIsSelectedFn());
  }

  onMenuClick(menu: ISdMenu, dropdownIndex: number): void {
    if (menu.url != null) {
      window.open(menu.url, "_blank");
    }

    if (menu.children === undefined) {
      this._dropdowns()[dropdownIndex].open.set(false);
    }
  }

  protected readonly itemTemplateType!: {
    menus: ISdMenu[];
    depth: number;
    dropdownIndex: number;
  };

  protected readonly tablerCaretDown = tablerCaretDown;
}
