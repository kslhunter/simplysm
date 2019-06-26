import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-table",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <table>
      <ng-content></ng-content>
    </table>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/presets";

    sd-table {
      display: block;
      width: auto;
      overflow: auto;

      > table {
        background: white;
        border-collapse: collapse;

        > * > * > * {
          border-right: 1px solid var(--theme-grey-light);
          padding: var(--gap-xs) var(--gap-sm);
        }

        > * > * {
          border-bottom: 1px solid var(--theme-grey-light);
        }

        > thead {
          background: var(--theme-grey-lightest);
          border-bottom: 2px solid var(--theme-grey-light);
        }
      }
    }

  `]
})
export class SdTableControl {
}
