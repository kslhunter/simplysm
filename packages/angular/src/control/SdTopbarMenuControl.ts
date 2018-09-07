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
      transition: .1s linear;
      transition-property: background, color;
      user-select: none;
      color: text-color(reverse, dark);
      float: left;

      &:hover {
        background: trans-color(dark);
        color: text-color(reverse, default);
      }

      &:active {
        transition: none;
        background: trans-color(darker);
        color: text-color(reverse, default);
      }

      @media #{$screen-mobile} {
        float: right;
      }
    }
  `]
})
export class SdTopbarMenuControl {
}