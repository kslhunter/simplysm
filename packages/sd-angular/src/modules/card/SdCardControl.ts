import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";

    sd-card {
      display: block;
      background: white;
      border-radius: 2px;
      @include elevation(1);
      overflow: hidden;
    }
  `]
})
export class SdCardControl {
}
