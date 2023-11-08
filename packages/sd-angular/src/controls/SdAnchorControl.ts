import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: inline-block;
      cursor: pointer;
      color: var(--theme-primary-default);

      &:hover {
        color: var(--theme-primary-dark);
        text-decoration: underline;
        //filter: drop-shadow(1px 1px 0 var(--text-trans-lightest));
      }

      &:active {
        color: var(--theme-primary-darker);
      }

      @media all and (pointer: coarse) {
        @include active-effect(true);

        &:hover {
          color: var(--theme-primary-default);
          text-decoration: none;
        }

        &:active {
          color: var(--theme-primary-default);
        }
      }

      &[disabled=true] {
        color: var(--theme-grey-light);
        cursor: default;
        pointer-events: none;

        @media all and (pointer: coarse) {
          @include active-effect(false);
        }
      }
    }
  `]
})
export class SdAnchorControl {
  @HostBinding("attr.tabindex")
  get tabIndex(): number | undefined {
    return this.disabled ? undefined : 0;
  }

  @Input({transform: coercionBoolean})
  @HostBinding("attr.disabled")
  disabled = false;
}
