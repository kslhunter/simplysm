import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-additional-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
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
      @use "../../../scss/commons/mixins";

      sd-additional-button {
        border: 1px solid var(--sd-bd-soft);
        border-radius: var(--sd-radius-default);
        overflow: hidden;

        > ._content {
          padding: var(--sd-gap-sm) var(--sd-gap-default);
        }

        > ._button {
          display: flex;
          flex-wrap: nowrap;
          @include mixins.flex-direction(row);

          > sd-anchor {
            padding: var(--sd-gap-sm) !important;
          }

          > sd-button > button {
            border-left: 1px solid var(--sd-bd-hairline) !important;
            padding: var(--sd-gap-sm) !important;
            height: 100%;
          }
        }

        &[data-sd-inset="true"] {
          border-radius: 0;
          border: none;
        }

        &[data-sd-size="sm"] {
          > ._content {
            padding: var(--sd-gap-xs) var(--sd-gap-default);
          }

          > ._button {
            > sd-anchor {
              padding: var(--sd-gap-xs) var(--sd-gap-sm) !important;
            }

            > sd-button > button {
              padding: var(--sd-gap-xs) var(--sd-gap-sm) !important;
            }
          }
        }

        &[data-sd-size="lg"] {
          > ._content {
            padding: var(--sd-gap-default) var(--sd-gap-xl);
          }

          > ._button {
            > sd-anchor {
              padding: var(--sd-gap-default) !important;
            }

            > sd-button > button {
              padding: var(--sd-gap-default) !important;
            }
          }
        }
      }
    `,
  ],
  host: {
    "class": "flex-row gap-sm",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-inset]": "inset()",
  },
})
export class SdAdditionalButton {
  size = input<"sm" | "lg">();
  inset = input(false, { transform: booleanAttribute });
}
