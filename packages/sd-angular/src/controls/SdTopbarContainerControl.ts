import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      @include container-base();
      padding-top: var(--sd-topbar-height);
    }
  `]
})
export class SdTopbarContainerControl {
}
