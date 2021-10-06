import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";

    :host {
      display: block;
      background: white;
      border-radius: var(--gap-xs);
      @include elevation(2);
      overflow: hidden;
      //padding-top: var(--gap-sm);
      //padding-bottom: var(--gap-sm);
    }
  `]
})
export class SdCardControl {
}
