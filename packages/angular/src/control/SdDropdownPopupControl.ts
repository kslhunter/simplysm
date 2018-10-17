import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      position: fixed;
      z-index: $z-index-dropdown;
      opacity: 0;
      transform: translateY(-10px);
      transition: .1s linear;
      transition-property: transform, opacity;
      pointer-events: none;
      background: white;
      min-width: 120px;
      border: 1px solid get($trans-color, dark);
      /*box-shadow: 0 1px 2px rgba(0, 0, 0, .3);
      border-radius: 2px;*/

      &:focus {
        outline: 1px solid theme-color(primary, default);
      }

      /*@media #{$screen-mobile} {
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        border-radius: 0;
        box-shadow: none;
      }*/
    }
  `]
})
export class SdDropdownPopupControl {
}