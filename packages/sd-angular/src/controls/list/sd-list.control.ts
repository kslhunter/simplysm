import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "class": "flex-column",
    "[attr.data-sd-inset]": "inset()",
  },
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      sd-list {
        user-select: none;
        background: var(--control-color);

        &[data-sd-inset="true"] {
          background: transparent;

          sd-list {
            background: transparent;
          }
        }
      }
    `,
  ],
})
export class SdListControl {
  inset = input(false, { transform: transformBoolean });
}
