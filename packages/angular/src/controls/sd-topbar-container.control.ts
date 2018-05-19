import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS*/ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      padding-top: 32px;
    }
  `]
})
export class SdTopbarContainerControl {
}