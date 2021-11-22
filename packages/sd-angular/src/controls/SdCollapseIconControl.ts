import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { faChevronDown } from "@fortawesome/pro-light-svg-icons";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fa-icon class="_icon" [icon]="falChevronDown" [fixedWidth]="true"></fa-icon>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      vertical-align: top;
      transition: transform .1s ease-in;

      &[sd-open=true] {
        transition: transform .1s ease-out;

        &[sd-open-rotate='90'] {
          transform: rotate(90deg);
        }

        &[sd-open-rotate='180'] {
          transform: rotate(180deg);
        }
      }
    }
  `]
})
export class SdCollapseIconControl {
  public falChevronDown = faChevronDown;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Input()
  @SdInputValidate({
    type: Number,
    includes: [90, 180]
  })
  @HostBinding("attr.sd-open-rotate")
  public openRotate: 180 | 90 = 90;
}
