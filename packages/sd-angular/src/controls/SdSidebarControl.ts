import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject} from "@angular/core";
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
      width: var(--sd-sidebar-width);
      height: 100%;
      background: var(--theme-color-blue-grey-darkest);
      color: var(--text-brightness-rev-default);
      transition: transform .1s ease-out;

      &[sd-toggle=true] {
        transform: translateX(-100%);
        transition: transform .1s ease-in;
      }
    }
  `]
})
export class SdSidebarControl {
  @HostBinding("attr.sd-toggle")
  public get toggle(): boolean | undefined {
    return this.parentControl?.toggle;
  }

  public constructor(@Inject(forwardRef(() => SdSidebarContainerControl))
                     public parentControl?: SdSidebarContainerControl) {
  }
}