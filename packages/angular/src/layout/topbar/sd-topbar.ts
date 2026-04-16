import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdSidebarContainer } from "../sidebar/sd-sidebar-container";
import { SdButton } from "../../controls/button/sd-button";
import { NgIcon } from "@ng-icons/core";
import { tablerMenu2 } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdButton, NgIcon],
  host: {
    "class": "flex-row gap-default cross-align-center main-align-start"
  },
  template: `
    @if (hasSidebar()) {
      <sd-button
        [theme]="'link-primary'"
        [buttonClass]="'p-sm-default'"
        (click)="onToggleButtonClick()"
      >
        <ng-icon [svg]="tablerMenu2" />
      </sd-button>
    }
    
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
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
          background-color: var(--trans-light);
        }

        &::-webkit-scrollbar-corner {
          background-color: var(--trans-light);
        }

        &::-webkit-scrollbar {
          width: var(--gap-sm);
          height: var(--gap-sm);
          background-color: transparent;
        }

        &::-webkit-scrollbar-thumb {
          background-color: var(--trans-default);
        }
      }
    `,
  ],
})
export class SdTopbar {
  private readonly _injectedSidebarContainer = inject(SdSidebarContainer, {
    optional: true,
  });

  sidebarContainer = input<SdSidebarContainer>();

  hasSidebar = computed(
    () => this.sidebarContainer() != null || this._injectedSidebarContainer != null,
  );

  onToggleButtonClick(): void {
    const sc = this.sidebarContainer() ?? this._injectedSidebarContainer;
    if (sc != null) {
      sc.toggle.update((v) => !v);
    }
  }

  protected readonly tablerMenu2 = tablerMenu2;
}
