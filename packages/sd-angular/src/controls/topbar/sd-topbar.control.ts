import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdSidebarContainerControl } from "../sidebar/sd-sidebar-container.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";

import { $computed } from "../../utils/bindings/$computed";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdButtonControl } from "../sd-button.control";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [FaIconComponent, SdButtonControl],
  host: {
    class: "flex-row gap-default cross-align-center main-align-start",
  },
  template: `
    <sd-button theme="link-primary" class="p-sm-default" (click)="onSidebarToggleButtonClick()">
      <fa-icon [icon]="icons.bars" />
    </sd-button>

    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../scss/mixins";

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
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #parentSidebarContainerControl = inject(SdSidebarContainerControl, { optional: true });

  sidebarContainer = input<SdSidebarContainerControl>();

  hasSidebar = $computed(() => !!this.sidebarContainer() || !!this.#parentSidebarContainerControl);

  onSidebarToggleButtonClick() {
    const sidebarContainerControl = this.sidebarContainer() ?? this.#parentSidebarContainerControl;
    sidebarContainerControl!.toggle.update((v) => !v);
  }
}
