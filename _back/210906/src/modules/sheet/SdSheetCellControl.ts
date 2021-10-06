import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-sheet-cell",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";

    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      padding: var(--sd-sheet-padding-v) var(--sd-sheet-padding-h);
      //height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
    }
  `]
})
export class SdSheetCellControl {
}
