import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {NumberUtil} from "@simplysm/sd-core-common";
import {coercionBoolean} from "../utils/commons";
import {SdIconControl} from "./SdIconControl";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdIconControl
  ],
  template: `
    <sd-icon [icon]="icon" fixedWidth/>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
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
  `],
  host: {
    "[attr.sd-open]": "open",
    "[attr.sd-open-rotate]": "openRotate"
  }
})
export class SdCollapseIconControl {
  @Input({transform: coercionBoolean}) open = false;
  @Input({required: true}) icon!: IconProp;
  @Input({transform: (val: "180" | "90" | 180 | 90) => NumberUtil.parseInt(val)}) openRotate: 180 | 90 = 90;
}
