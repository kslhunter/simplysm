import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../utils/SdInputValidate";
import {CommonModule} from "@angular/common";

const vars = {
  borderColor: {
    light: "var(--theme-blue-grey-lightest)",
    dark: "var(--theme-grey-light)"
  }
};

@Component({
  selector: "sd-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  template: `
    <table>
      <ng-content></ng-content>
    </table>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;

      ::ng-deep > table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-right: 1px solid ${vars.borderColor.dark};
        border-bottom: 1px solid ${vars.borderColor.dark};

        > * > tr > * {
          padding: var(--gap-xs) var(--gap-sm);
          border-left: 1px solid ${vars.borderColor.light};

          &:first-child {
            border-left: 1px solid ${vars.borderColor.dark};
          }
        }

        > tbody > tr > td:first-child {
          border-left: 1px solid ${vars.borderColor.dark};
        }

        > * > tr {
          > * {
            border-top: 1px solid ${vars.borderColor.light};
          }

          &:first-child > * {
            border-top: 1px solid ${vars.borderColor.dark};
          }
        }

        > tbody > tr:first-child {
          border-top: 1px solid ${vars.borderColor.dark};
        }

        > thead > tr > th {
          background: var(--theme-grey-lightest);
        }

        > tbody > tr > th {
          background: var(--theme-grey-lightest);
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
        ::ng-deep > table {
          border-bottom: none;

          > * > tr > * {
            border-top: none;
          }
        }
      }

      &[sd-cell-border=horizontal] {
        ::ng-deep > table {
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
  `]
})
export class SdTableControl {
  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate({type: String, includes: ["vertical", "horizontal", "all"]})
  @HostBinding("attr.sd-cell-border")
  public cellBorder: "vertical" | "horizontal" | "all" = "all";
}
