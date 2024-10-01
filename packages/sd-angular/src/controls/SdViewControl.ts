import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-view {
        display: block;
        background: white;

        &[sd-fill="true"] {
          height: 100%;
        }
      }
    `,
  ],
  template: `<ng-content></ng-content>`,
})
export class SdViewControl {
  value = input<any>();
  fill = input(false);

  constructor() {
    $hostBinding("attr.sd-fill", this.fill);
  }
}
