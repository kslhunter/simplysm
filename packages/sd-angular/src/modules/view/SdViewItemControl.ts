import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  ViewEncapsulation
} from "@angular/core";
import {SdViewControl} from "./SdViewControl";

@Component({
  selector: "sd-view-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-view {
      display: block;
      background: white;
    }

    sd-view-item {
      display: none;

      &[sd-selected=true] {
        display: block;
      }
    }
  `]
})
export class SdViewItemControl {
  @Input()
  public value?: any;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(@Inject(forwardRef(() => SdViewControl))
                     private readonly _parentControl: SdViewControl) {
  }
}
