import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      padding: 0 gap(default);
      cursor: pointer;
      transition: background .1s linear;
      user-select: none;
      color: theme-color(primary, default);

      &:hover {
        background: trans-color(dark);
      }

      &:active {
        transition: none;
        background: trans-color(darker);
      }
    }
  `]
})
export class SdTopbarMenuControl {
}