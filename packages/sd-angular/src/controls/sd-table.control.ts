import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      //$border-color-light: var(--theme-blue-grey-lightest);
      //$border-color-dark: var(--theme-grey-light);
      $border-color-light: var(--theme-grey-lighter);
      $border-color-dark: var(--theme-grey-lighter);

      sd-table {
        display: block;

        > table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          border-right: 1px solid $border-color-dark;
          border-bottom: 1px solid $border-color-dark;

          border-radius: var(--border-radius-default);
          overflow: hidden;

          > * > tr > * {
            padding: var(--gap-xs) var(--gap-sm);
            border-left: 1px solid $border-color-light;

            &:first-child {
              border-left: 1px solid $border-color-dark;
            }
          }

          > tbody > tr > td:first-child {
            border-left: 1px solid $border-color-dark;
          }

          > * > tr {
            > * {
              border-top: 1px solid $border-color-light;
            }

            &:first-child > * {
              border-top: 1px solid $border-color-dark;
            }
          }

          > tbody > tr:first-child {
            border-top: 1px solid $border-color-dark;
          }

          > thead > tr > th {
            background: var(--theme-grey-lightest);
          }

          > tbody > tr > th {
            background: var(--theme-grey-lightest);
          }

          > tbody > tr > td {
            vertical-align: top;
          }
        }

        &[sd-inset="true"] {
          > table {
            border-right: none;
            border-bottom: none;

            > * > tr > *:first-child {
              border-left: none;
            }

            > *:first-child > tr:first-child > * {
              border-top: none;
            }
          }
        }

        &[sd-inline="true"] {
          > table {
            width: auto;
          }
        }

        &[sd-cell-border="vertical"] {
          > table {
            border-bottom: none;

            > * > tr > * {
              border-top: none;
            }
          }
        }

        &[sd-cell-border="horizontal"] {
          > table {
            border-right: none;

            > tbody > tr > td:first-child {
              border-left: none;
            }

            > * > tr > * {
              border-left: none;
            }
          }
        }
      }
    `,
  ],
  template: `
    <table>
      <ng-content></ng-content>
    </table>
  `,
  host: {
    "[attr.sd-inset]": "inset()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-cell-border]": "cellBorder()",
  },
})
export class SdTableControl {
  inset = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });
  cellBorder = input<"vertical" | "horizontal" | "all">("all");
}
