import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {NumberUtil} from "@simplysm/sd-core-common";
import {coercionBoolean} from "../../utils/commons";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-icon class="_icon" [icon]="icon" fixedWidth/>`,
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
  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-open")
  open = false;

  @Input({required: true})
  icon!: IconProp;

  @Input({transform: (val: "180" | "90" | 180 | 90) => NumberUtil.parseInt(val)})
  @HostBinding("attr.sd-open-rotate")
  public openRotate: 180 | 90 = 90;
}
