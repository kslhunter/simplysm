import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, inject} from "@angular/core";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;
      position: absolute;
      z-index: var(--z-index-sidebar);
      top: 0;
      left: 0;
      width: var(--sidebar-width);
      height: 100%;

      body.sd-theme-compact &,
      body.sd-theme-modern & {
        transition: transform .1s ease-out;

        &[sd-toggle=true] {
          transform: translateX(-100%);
          transition: transform .1s ease-in;
        }
      }

      body.sd-theme-kiosk &,
      body.sd-theme-mobile & {
        transition: transform .3s ease-in;
        transform: translateX(-100%);

        &[sd-toggle=true] {
          transform: none;
          transition: transform .3s ease-out;
          @include elevation(16);
        }
      }

      body.sd-theme-compact & {
        background: var(--theme-blue-grey-darkest);
        color: var(--text-trans-rev-default);

        img {
          filter: brightness(100);
        }
      }

      body.sd-theme-modern &,
      body.sd-theme-kiosk &,
      body.sd-theme-mobile & {
        background: white;
      }
      
      body.sd-theme-kiosk &,
      body.sd-theme-mobile & {
        border-top-right-radius: var(--gap-default);
        border-bottom-right-radius: var(--gap-default);
      }

      body.sd-theme-modern & {
        @include elevation(2);

        &[sd-toggle=true] {
          @include elevation(0);
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
