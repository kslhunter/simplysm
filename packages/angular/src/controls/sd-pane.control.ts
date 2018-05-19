import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-pane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: auto;
    }
  `]
})
export class SdPaneControl {
}