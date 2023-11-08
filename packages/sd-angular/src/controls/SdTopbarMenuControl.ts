import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: inline-block;
      padding: 0 var(--gap-lg);
      cursor: pointer;
      color: var(--text-trans-rev-dark);

      @media all and (pointer: coarse) {
        @include active-effect(true);
      }

      @media not all and (pointer: coarse) {
        &:hover {
          background: var(--trans-default);
          color: var(--text-trans-rev-default);
        }
      }

      @media all and (pointer: coarse) {
        color: var(--text-trans-lighter);
        padding: 0 var(--gap-default);
      }

      &[disabled=true] {
        pointer-events: none;
        opacity: .5;

        @media all and (pointer: coarse) {
          @include active-effect(false);
        }
      }
    }
  `]
})
export class SdTopbarMenuControl {
  @Input({transform: coercionBoolean})
  @HostBinding("attr.disabled")
  disabled = false;
}
