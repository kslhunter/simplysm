import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../../decorators/SdInputValidate";

@Component({
  selector: "sd-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table>
      <ng-content></ng-content>
    </table>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      $border-color-light: var(--theme-color-blue-grey-lightest);
      $border-color-dark: var(--theme-color-grey-light);

      ::ng-deep > table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-right: 1px solid $border-color-dark;
        border-bottom: 1px solid $border-color-dark;

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
          background: var(--theme-color-grey-lightest);
        }

        > tbody > tr > th {
          background: var(--theme-color-grey-lightest);
        }
      }

      &[sd-inset=true] {
        ::ng-deep > table {
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

      &[sd-cell-border=vertical] {
        border-bottom: none;

        ::ng-deep table {
          > * > tr > * {
            border-top: none;
          }
        }
      }

      &[sd-cell-border=horizontal] {
        border-right: none;

        ::ng-deep table {
          > * > tr > * {
            border-left: none;
          }
        }
      }
    }
  `]
})
export class SdTableControl {
  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate({ type: String, includes: ["vertical", "horizontal", "all"] })
  @HostBinding("attr.sd-cell-border")
  public cellBorder: "vertical" | "horizontal" | "all" = "all";
}
