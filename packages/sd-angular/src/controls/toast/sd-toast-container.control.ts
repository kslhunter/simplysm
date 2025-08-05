import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../utils/type-tramsforms";

@Component({
  selector: "sd-toast-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-toast-container {
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        pointer-events: none;
        padding: var(--gap-xxl);
        z-index: var(--z-index-toast);

        @media all and (max-width: 520px) {
          flex-direction: column-reverse;
        }

        &[data-sd-overlap="true"] {
          display: block;

          > sd-toast {
            position: absolute;
            bottom: var(--gap-xxl);
            left: var(--gap-xxl);
            right: var(--gap-xxl);
            width: auto;
          }
        }
      }
    `,
  ],
  template: "",
  host: {
    "[attr.data-sd-overlap]": "overlap()",
  },
})
export class SdToastContainerControl {
  overlap = input(false, { transform: transformBoolean });
}
