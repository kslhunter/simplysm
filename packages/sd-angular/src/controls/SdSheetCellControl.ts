import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-sheet-cell",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    
    :host {
      display: block;
      padding: var(--sd-sheet-padding-v) var(--sd-sheet-padding-h);
    }
  `]
})
export class SdSheetCellControl {
}