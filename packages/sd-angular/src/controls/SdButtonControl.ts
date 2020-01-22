import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `Button`,
  host: {
    "role": "button",
    "tabindex": "0"
  }
})
export class SdButtonControl {
}
