import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      @include clear-fix();
      margin: gap(default) / -2;
    }
  `]
})
export class SdGridControl {
}