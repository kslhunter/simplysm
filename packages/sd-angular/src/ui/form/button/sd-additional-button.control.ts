import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";

@Component({
  selector: "sd-additional-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "class": "flex-row gap-sm",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-inset]": "inset()",
  },
  template: `
    <div class="_content flex-fill">
      <ng-content />
    </div>
    <div class="_button">
      <ng-content select="sd-anchor" />
      <ng-content select="sd-button" />
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-additional-button {
        border: 1px solid var(--trans-light);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > ._content {
          padding: var(--gap-sm) var(--gap-default);
        }

        > ._button {
          display: flex;
          flex-wrap: nowrap;
          flex-direction: row;

          > sd-anchor {
            padding: var(--gap-sm) !important;
          }

          > sd-button > button {
            border-left: 1px solid var(--trans-lighter) !important;
            padding: var(--gap-sm) !important;
            height: 100%;
          }
        }

        &[data-sd-inset="true"] {
          border-radius: 0;
          border: none;
        }

        &[data-sd-size="sm"] {
          > ._content {
            padding: var(--gap-xs) var(--gap-default);
          }

          > ._button {
            > sd-anchor {
              padding: var(--gap-xs) var(--gap-sm) !important;
            }

            > sd-button > button {
              padding: var(--gap-xs) var(--gap-sm) !important;
            }
          }
        }

        &[data-sd-size="lg"] {
          > ._content {
            padding: var(--gap-default) var(--gap-xl);
          }

          > ._button {
            > sd-anchor {
              padding: var(--gap-default) !important;
            }

            > sd-button > button {
              padding: var(--gap-default) !important;
            }
          }
        }
      }
    `,
  ],
})
export class SdAdditionalButtonControl {
  size = input<"sm" | "lg">();
  inset = input(false, { transform: transformBoolean });
}
