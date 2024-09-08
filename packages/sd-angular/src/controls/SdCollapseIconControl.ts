import { ChangeDetectionStrategy, Component, inject, Input, ViewEncapsulation } from "@angular/core";
import { coercionBoolean, coercionNumber } from "../utils/commons";
import { SdIconControl } from "./SdIconControl";
import { SdAngularOptionsProvider } from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdIconControl],
  template: ` <sd-icon [icon]="icon" fixedWidth /> `,
  styles: [
    /* language=SCSS */ `
      sd-collapse-icon {
        display: inline-block;
        transition: transform 0.1s ease-in;

        &[sd-open="true"] {
          transition: transform 0.1s ease-out;
        }
      }
    `,
  ],
  host: {
    "[attr.sd-open]": "open",
    "[style.transform]": "open ? 'rotate(' + openRotate + 'deg)' : ''",
  },
})
export class SdCollapseIconControl {
  icons = inject(SdAngularOptionsProvider).icons;

  @Input() icon = this.icons.angleDown;
  @Input({ transform: coercionBoolean }) open = false;
  @Input({ transform: coercionNumber }) openRotate = 90;
}
