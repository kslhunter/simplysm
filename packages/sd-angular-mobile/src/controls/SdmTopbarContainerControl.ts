import { ChangeDetectionStrategy, Component, HostBinding } from "@angular/core";

@Component({
  selector: "sdm-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
    }
  `]
})
export class SdmTopbarContainerControl {
  @HostBinding("style.padding-top.px")
  public paddingTopPx = 0;
}
