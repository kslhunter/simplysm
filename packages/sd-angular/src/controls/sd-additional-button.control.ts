import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-additional-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div class="_content">
      <ng-content />
    </div>
    <div class="_button">
      <ng-content select="sd-anchor" />
      <ng-content select="sd-button" />      
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../scss/mixins";

      sd-additional-button {
        display: flex;
        flex-wrap: nowrap;
        flex-direction: row;
        gap: var(--gap-sm);
        border: 1px solid var(--trans-light);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > ._content {
          flex-grow: 1;
          overflow: auto;
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
            border-left: 1px solid var(--trans-light) !important;
            padding: var(--gap-sm) !important;
          }
        }

        &[sd-inset="true"] {
          border-radius: 0;
          border: none;
        }

        &[sd-size="sm"] {
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

        &[sd-size="lg"] {
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
  host: {
    "[attr.sd-size]": "size()",
    "[attr.sd-inset]": "inset()",
  },
})
export class SdAdditionalButtonControl {
  size = input<"sm" | "lg">();
  inset = input(false, { transform: transformBoolean });
}
