import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_icon">
      <ng-content select="sd-icon"></ng-content>
    </div>
    <div class="_content">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/presets";

    sd-topbar-menu {
      padding: 0 var(--gap-lg);
      cursor: pointer;
      user-select: none;
      color: rgba(255, 255, 255, .7);
      font-weight: bold;

      > ._icon,
      > ._content {
        display: inline;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.2);
        color: white;
      }

      &:active {
        background: rgba(0, 0, 0, .3);
        color: white;
      }
    }
  `]
})
export class SdTopbarMenuControl {
}
