import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";

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
        background: var(--control-color);
        width: 100%;

        &[data-sd-inset="true"] {
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
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.data-sd-inset]": "inset()",
  },
})
export class SdListControl {
  inset = input(false, { transform: transformBoolean });
}
