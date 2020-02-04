import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-icon class="_icon" icon="chevron-down" fixedWidth></sd-icon>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      vertical-align: top;
      transition: transform .1s ease-in;

      &[sd-open=true] {
        transform: rotate(90deg);
        transition: transform .1s ease-out;
      }
    }
  `]
})
export class SdCollapseIconControl {
  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;
}