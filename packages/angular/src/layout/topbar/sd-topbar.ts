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
    class: "flex-row gap-sm cross-align-center main-align-start",
  },
  template: `
    @if (hasSidebar()) {
      <sd-button
        [size]="'sm'"
        [theme]="'link-gray'"
        [buttonClass]="'p-xs-sm'"
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
        min-height: var(--sd-topbar-height);
        overflow-x: auto;
        overflow-y: hidden;
        user-select: none;

        color: var(--sd-tx-default);
        border-bottom: 1px solid var(--sd-bd-soft);
        padding-left: var(--sd-gap-xs);

        @each $h in (h1, h2, h3, h4, h5, h6) {
          > #{$h} {
            padding-right: var(--sd-gap-xl);
          }
        }

        &::-webkit-scrollbar-track {
          background-color: var(--sd-scrollbar-track);
        }

        &::-webkit-scrollbar-corner {
          background-color: var(--sd-scrollbar-track);
        }

        &::-webkit-scrollbar {
          width: var(--sd-gap-sm);
          height: var(--sd-gap-sm);
          background-color: transparent;
        }

        &::-webkit-scrollbar-thumb {
          background-color: var(--sd-scrollbar-thumb-hover);
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
