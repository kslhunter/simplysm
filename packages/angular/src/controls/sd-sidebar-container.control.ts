import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-sidebar-container",
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
      padding-left: 200px;
    }
  `]
})
export class SdSidebarContainerControl {
}