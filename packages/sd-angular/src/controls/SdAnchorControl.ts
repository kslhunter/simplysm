import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      cursor: pointer;
      color: var(--theme-color-primary-default);

      &:hover {
        color: var(--theme-color-primary-dark);
        text-decoration: underline;
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

    @media (hover: none) and (pointer: coarse) {
      :host {
        &:hover {
          color: var(--theme-color-primary-default);
          text-decoration: none;
        }

        &:active {
          color: var(--theme-color-primary-default);
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
