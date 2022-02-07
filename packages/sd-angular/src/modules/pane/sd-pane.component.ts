import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-pane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";

    :host {
      @include container-base();
      overflow: auto;
    }
  `]
})
export class SdPaneComponent {
}
