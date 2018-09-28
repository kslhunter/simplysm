import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      width: 100%;
      background: white;
    }
  `]
})
export class SdCardControl {
}