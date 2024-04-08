import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      background: white;

      &[sd-fill=true] {
        height: 100%;
      }
    }
  `]
})
export class SdViewControl {
  @Input()
  value?: any;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-fill")
  fill = false;
}
