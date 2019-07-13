import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <sd-dock-container>
      <sd-dock class="_brand">
        <ng-content select="sd-sidebar-brand"></ng-content>
      </sd-dock>
      <sd-dock class="_user">
        <ng-content select="sd-sidebar-user"></ng-content>
      </sd-dock>
      <sd-pane>
        <ng-content></ng-content>
      </sd-pane>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ `
    sd-sidebar {
      display: block;
      position: absolute;
      z-index: var(--z-index-sidebar);
      top: 0;
      left: 0;
      width: var(--sidebar-width);
      height: 100%;
      background: white;

      > sd-dock-container {
        > sd-dock {
          border: none !important;
          background: var(--theme-bluegrey-darkest);
        }

        > ._brand {
          z-index: calc(var(--z-index-sidebar) + 1);
        }
      }
    }
  `]
})
export class SdSidebarControl {
}
