import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-form-box",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content></ng-content> `,
  styles: [
    /* language=SCSS */ `
      sd-form-box {
        &[sd-layout="cascade"] {
          display: flex;
          flex-direction: column;
          gap: var(--gap-default);
        }

        &[sd-layout="table"] {
          display: table;
          width: 100%;
        }

        &[sd-layout="inline"] {
          display: inline-flex;
          flex-wrap: wrap;
          gap: var(--gap-sm);
        }

        &[sd-layout="none"] {
          display: contents;
        }
      }
    `,
  ],
})
export class SdFormBoxControl {
  layout = input<"cascade" | "inline" | "table" | "none">("cascade");
  labelWidth = input<string>();
  labelAlign = input<"left" | "right" | "center">();

  constructor() {
    $hostBinding("attr.sd-layout", this.layout);
  }
}
