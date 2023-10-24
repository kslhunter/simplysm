import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, inject} from "@angular/core";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: block;
      position: absolute;
      z-index: var(--z-index-sidebar);
      top: 0;
      left: 0;
      width: var(--sidebar-width);
      height: 100%;
      background: var(--theme-blue-grey-darkest);
      color: var(--text-trans-rev-default);
      transition: transform .1s ease-out;

      &[sd-toggle=true] {
        transform: translateX(-100%);
        transition: transform .1s ease-in;
      }
    }

    @media all and (max-width: 520px) {
      :host {
        transform: translateX(-100%);
        transition: transform .3s ease-in;

        &[sd-toggle=true] {
          transform: none;
          transition: transform .3s ease-out;
          @include elevation(16);
        }
      }
    }
  `]
})
export class SdSidebarControl {
  #parentControl: SdSidebarContainerControl = inject(forwardRef(() => SdSidebarContainerControl));

  @HostBinding("attr.sd-toggle")
  get toggle(): boolean | undefined {
    return this.#parentControl.toggle;
  }
}
