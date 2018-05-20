import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-combobox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
    }
  `]
})
export class SdComboboxControl {
}