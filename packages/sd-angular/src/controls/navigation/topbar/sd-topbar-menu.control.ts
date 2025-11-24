import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { useFullPageCodeSignal } from "../../../core/utils/signals/useFullPageCodeSignal";
import { SdListControl } from "../../list/sd-list.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdTypedTemplateDirective } from "../../../core/directives/sd-typed-template.directive";
import { SdListItemControl } from "../../list/sd-list-item.control";
import { SdRouterLinkDirective } from "../../../core/directives/sd-router-link.directive";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import * as querystring from "querystring";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdDropdownControl } from "../../overlay/dropdown/sd-dropdown.control";
import { SdButtonControl } from "../../form/button/sd-button.control";
import { SdAngularConfigProvider } from "../../../core/providers/sd-angular-config.provider";
import { SdDropdownPopupControl } from "../../overlay/dropdown/sd-dropdown-popup.control";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdListControl,
    NgTemplateOutlet,
    SdTypedTemplateDirective,
    SdListItemControl,
    SdRouterLinkDirective,
    FaIconComponent,
    SdDropdownControl,
    SdButtonControl,
    SdDropdownPopupControl,
  ],
  host: {
    class: "flex-row gap-sm",
  },
  template: `
    @for (menu of menus(); track menu.codeChain.join(".")) {
      <sd-dropdown #dropdownEl>
        <sd-button [theme]="'link-gray'">
          @if (menu.icon) {
            <fa-icon [icon]="menu.icon" [fixedWidth]="true" />
          }
          {{ menu.title }}
          <fa-icon [icon]="icons.caretDown" [fixedWidth]="true" />
        </sd-button>

        <sd-dropdown-popup>
          <sd-list [inset]="true">
            <ng-template
              [ngTemplateOutlet]="itemTpl"
              [ngTemplateOutletContext]="{
                menus: menu.children,
                depth: 0,
                dropdownEl: dropdownEl,
              }"
            ></ng-template>
          </sd-list>
        </sd-dropdown-popup>
      </sd-dropdown>
    }

    <ng-template
      #itemTpl
      [typed]="itemTemplateType"
      let-currMenus="menus"
      let-depth="depth"
      let-dropdownEl="dropdownEl"
    >
      @for (menu of currMenus; track menu.codeChain.join(".")) {
        <sd-list-item
          [contentClass]="depth === 0 ? 'pv-default' : ''"
          [contentStyle]="'padding-left: ' + (depth + 1) * 0.5 + 'em'"
          [sd-router-link]="getMenuRouterLinkOption(menu)"
          (click)="onMenuClick(menu); dropdownEl.open.set(false)"
          [selected]="getIsMenuSelected(menu)"
          [layout]="'flat'"
        >
          @if (menu.icon) {
            <fa-icon [icon]="menu.icon" [fixedWidth]="true" />
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

      sd-topbar-menu {
        sd-list sd-list {
          background: var(--trans-lightest);
        }
      }
    `,
  ],
})
export class SdTopbarMenuControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  menus = input<ISdTopbarMenu[]>([]);
  getMenuIsSelectedFn = input<(menu: ISdTopbarMenu) => boolean>();

  fullPageCode = useFullPageCodeSignal();

  getMenuRouterLinkOption(menu: ISdTopbarMenu) {
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

  getIsMenuSelected(menu: ISdTopbarMenu) {
    return this.getMenuIsSelectedFn()
      ? this.getMenuIsSelectedFn()!(menu)
      : this.fullPageCode() === menu.codeChain.join(".");
  }

  onMenuClick(menu: ISdTopbarMenu): void {
    if (menu.url != null) {
      window.open(menu.url, "_blank");
    }
  }

  protected readonly itemTemplateType!: {
    menus: ISdTopbarMenu[];
    depth: number;
    dropdownEl: SdDropdownControl;
  };
}

export interface ISdTopbarMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: IconDefinition;
  children?: ISdTopbarMenu[];
}
