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
      border: 1px solid trans-color(default);
    }
  `]
})
export class SdCardControl {
}