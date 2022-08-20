import { ChangeDetectionStrategy, Component, HostBinding } from "@angular/core";

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;

      padding-left: var(--sd-sidebar-width);
      transition: padding-left .1s ease-out;

      &[sd-toggle=true] {
        padding-left: 0;
        transition: padding-left .1s ease-in;
      }
    }
  `]
})
export class SdSidebarContainerControl {
  @HostBinding("attr.sd-toggle")
  public toggle = false;
}
