import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdSidebarContainerControl } from "../sidebar/sd-sidebar-container.control";

import { $computed } from "../../../core/utils/bindings/$computed";
import { SdButtonControl } from "../../form/button/sd-button.control";
import { NgIcon } from "@ng-icons/core";
import { tablerMenu2 } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdButtonControl, NgIcon],
  host: {
    class: "flex-row gap-default cross-align-center main-align-start",
  },
  template: `
    @if (hasSidebar()) {
      <sd-button
        [theme]="'link-primary'"
        [buttonClass]="'p-sm-default'"
        (click)="onSidebarToggleButtonClick()"
      >
        <ng-icon [svg]="tablerMenu2" />
      </sd-button>
    }

    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-topbar {
        min-height: var(--topbar-height);
        overflow-x: auto;
        overflow-y: hidden;
        user-select: none;

        background: var(--control-color);
        color: var(--text-trans-default);
        border-bottom: 1px solid var(--border-color-lighter);
        padding-left: var(--gap-sm);

        @each $h in (h1, h2, h3, h4, h5, h6) {
          > #{$h} {
            padding-right: var(--gap-xl);
          }
        }

        &::-webkit-scrollbar-track {
          background-color: rgba(0, 0, 0, 0.1);
        }

        &::-webkit-scrollbar-corner {
          background-color: rgba(0, 0, 0, 0.1);
        }

        &::-webkit-scrollbar {
          width: var(--gap-sm);
          height: var(--gap-sm);
          background-color: rgba(0, 0, 0, 0);
        }

        &::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
        }
      }
    `,
  ],
})
export class SdTopbarControl {
  private readonly _parentSidebarContainerControl = inject(SdSidebarContainerControl, {
    optional: true,
  });

  sidebarContainer = input<SdSidebarContainerControl>();

  hasSidebar = $computed(() => !!this.sidebarContainer() || !!this._parentSidebarContainerControl);

  onSidebarToggleButtonClick() {
    const sidebarContainerControl = this.sidebarContainer() ?? this._parentSidebarContainerControl;
    sidebarContainerControl!.toggle.update((v) => !v);
  }

  protected readonly tablerMenu2 = tablerMenu2;
}
