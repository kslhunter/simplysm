import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-view {
      display: block;
      background: white;

      &[sd-fill=true] {
        height: 100%;
      }
    }
  `],
  host: {
    "[attr.sd-fill]": "fill"
  }
})
export class SdViewControl {
  @Input() value?: any;
  @Input({transform: coercionBoolean}) fill = false;
}
