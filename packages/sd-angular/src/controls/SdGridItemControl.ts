import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";

@Component({
  selector: "sd-grid-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      vertical-align: top;

      @media screen and (max-width: 600px) {
        width: 100% !important;
      }
    }
  `]
})
export class SdGridItemControl {
  @Input()
  @HostBinding("style.width")
  public width = "100%";
}
