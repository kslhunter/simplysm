import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[attr.tabindex]": "disabled ? undefined : 0"
  },
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      cursor: pointer;
      color: var(--theme-color-primary-default);

      &:focus {
        outline-color: transparent;
        background: var(--trans-brightness-light);
      }

      &:hover {
        color: var(--theme-color-primary-dark);
      }

      &:active {
        color: var(--theme-color-primary-darker);
      }

      &[disabled=true] {
        color: var(--theme-color-grey-light);
        cursor: default;
        pointer-events: none;
      }
    }
  `]
})
export class SdAnchorControl {
  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.disabled")
  public disabled?: boolean;
}