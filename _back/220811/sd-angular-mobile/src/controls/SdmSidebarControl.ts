import { ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject } from "@angular/core";
import { SdmSidebarContainerControl } from "./SdmSidebarContainerControl";

@Component({
  selector: "sdm-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../sd-angular/scss/mixins";

    :host {
      display: block;
      position: absolute;
      z-index: var(--z-index-sidebar);
      top: 0;
      left: 0;
      width: var(--sd-sidebar-width);
      height: 100%;
      background: white;
      color: var(--text-brightness-light);

      transform: translateX(-100%);
      transition: transform var(--mobile-animation-duration) ease-in;

      border-top-right-radius: var(--gap-lg);
      border-bottom-right-radius: var(--gap-lg);
      
      overflow: hidden;

      &[sd-toggle=true] {
        transform: none;
        transition: transform .3s ease-out;
        @include elevation(16);
      }
    }
  `]
})
export class SdmSidebarControl {
  @HostBinding("attr.sd-toggle")
  public get toggle(): boolean | undefined {
    return this.parentControl?.toggle;
  }

  public constructor(@Inject(forwardRef(() => SdmSidebarContainerControl))
                     public readonly parentControl?: SdmSidebarContainerControl) {
  }
}
