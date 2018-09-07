import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";

@Component({
  selector: "sd-grid-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      float: left;
      padding: gap(default) / 2;
    }
  `]
})
export class SdGridItemControl {
  @Input()
  @HostBinding("style.width")
  public width = "100%";
}