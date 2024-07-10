import {ChangeDetectionStrategy, Component, forwardRef, inject, Input, ViewEncapsulation} from "@angular/core";
import {SdViewControl} from "./SdViewControl";

@Component({
  selector: "sd-view-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-view-item {
      display: none;

      &[sd-selected=true] {
        display: block;
      }

      sd-view[sd-fill=true] & {
        height: 100%;
      }
    }
  `],
  host: {
    "[attr.sd-selected]": "isSelected"
  }
})
export class SdViewItemControl {
  @Input() value?: any;

  #parentControl: SdViewControl = inject(forwardRef(() => SdViewControl));

  get isSelected(): boolean {
    return this.#parentControl.value === this.value;
  }
}
