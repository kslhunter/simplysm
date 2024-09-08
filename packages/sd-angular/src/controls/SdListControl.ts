import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from "@angular/core";
import { coercionBoolean } from "../utils/commons";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content></ng-content>`,
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
  host: {
    "[attr.sd-inset]": "inset",
  },
})
export class SdListControl {
  @Input({ transform: coercionBoolean }) inset = false;
}
