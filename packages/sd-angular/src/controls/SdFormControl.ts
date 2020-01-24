import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "role": "form"
  },
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables-scss-arr";

    :host {
    }
  `]
})
export class SdFormControl {
}
