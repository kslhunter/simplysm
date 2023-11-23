import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      user-select: none;
      border-radius: var(--border-radius-default);
      overflow: hidden;
      background: white;

      &[sd-inset=true] {
        border-radius: 0;
        background: transparent;

        ::ng-deep sd-list {
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
  `]
})
export class SdListControl {
  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;
}