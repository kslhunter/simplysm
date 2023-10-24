import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {coercionBoolean} from "../../utils/commons";

@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    }
  `]
})
export class SdListControl {
  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;
}