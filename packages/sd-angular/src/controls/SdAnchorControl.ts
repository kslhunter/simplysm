import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../utils/SdInputValidate";
import {CommonModule} from "@angular/common";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      cursor: pointer;
      color: var(--theme-primary-default);

      &:hover {
        color: var(--theme-primary-dark);
        text-decoration: underline;
        filter: drop-shadow(1px 1px 0 var(--text-trans-lightest));
      }

      &:active {
        color: var(--theme-primary-darker);
      }

      &[disabled=true] {
        color: var(--theme-grey-light);
        cursor: default;
        pointer-events: none;
      }
    }

    @media (hover: none) and (pointer: coarse) {
      :host {
        &:hover {
          color: var(--theme-primary-default);
          text-decoration: none;
        }

        &:active {
          color: var(--theme-primary-default);
        }
      }
    }
  `]
})
export class SdAnchorControl {
  @HostBinding("attr.tabindex")
  public get tabIndex(): number | undefined {
    return this.disabled === true ? undefined : 0;
  }

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.disabled")
  public disabled?: boolean;
}
