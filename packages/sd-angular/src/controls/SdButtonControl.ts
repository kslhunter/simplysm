import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "role": "button",
    "tabindex": "0"
  },
  template: `Button`,
  styles: [/* language=SCSS */ `
    @import "../../scss/preset";

    :host {
      display: block;
      padding: get($gap, default);
      text-align: center;
      background: white;
      border: 1px solid $sd-border-color;
      cursor: pointer;
      border-radius: 2px;
    }
  `]
})
export class SdButtonControl {
}
