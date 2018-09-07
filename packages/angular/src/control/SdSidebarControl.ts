import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: absolute;
      z-index: $z-index-sidebar;
      top: 0;
      left: 0;
      width: 200px;
      height: 100%;
      background: white;
    }
  `]
})
export class SdSidebarControl {
}