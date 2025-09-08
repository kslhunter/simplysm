import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms/tramsformBoolean";

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
        background: var(--control-color);

        &[data-sd-fill="true"] {
          height: 100%;
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.data-sd-fill]": "fill()",
  },
})
export class SdViewControl {
  value = input<any>();
  fill = input(false, { transform: transformBoolean });
}
