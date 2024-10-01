import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-list {
        display: block;
        user-select: none;
        border-radius: var(--border-radius-default);
        overflow: hidden;
        background: white;

        &[sd-inset="true"] {
          border-radius: 0;
          background: transparent;

          sd-list {
            border-radius: 0;
            background: transparent;
          }
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content>`,
})
export class SdListControl {
  inset = input(false);

  constructor() {
    $hostBinding("attr.sd-inset", this.inset);
  }
}
