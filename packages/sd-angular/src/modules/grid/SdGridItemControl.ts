import {ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-grid-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/presets";

    sd-grid-item {
      display: inline-block;
      vertical-align: top;
    }
  `]
})
export class SdGridItemControl {
  @Input()
  @HostBinding("style.width")
  public width = "100%";
}
