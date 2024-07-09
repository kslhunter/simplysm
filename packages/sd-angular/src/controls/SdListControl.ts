import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-list {
      display: block;
      user-select: none;
      border-radius: var(--border-radius-default);
      overflow: hidden;
      background: white;

      &[sd-inset=true] {
        border-radius: 0;
        background: transparent;

        sd-list {
          border-radius: 0;
          background: transparent;
        }
      }

      //body.sd-theme-modern &,
      //body.sd-theme-kiosk &,
      //body.sd-theme-mobile & {
      //  padding: 0 var(--gap-sm);
      //
      //  &[sd-inset=true] {
      //    padding: 0;
      //  }
      //}
    }
  `],
  host: {
    "[attr.sd-inset]": "inset"
  }
})
export class SdListControl {
  @Input({transform: coercionBoolean}) inset = false;
}