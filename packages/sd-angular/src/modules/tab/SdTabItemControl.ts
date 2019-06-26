import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Input,
  ViewEncapsulation
} from "@angular/core";
import {SdTabControl} from "./SdTabControl";

@Component({
  selector: "sd-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/presets";

    sd-tab-item {
      display: inline-block;
      padding: var(--gap-sm) var(--gap-default);
      cursor: pointer;
      border-top: 2px solid transparent;
      border-left: 1px solid transparent;
      border-right: 1px solid transparent;
      margin-bottom: -2px;

      &:hover {
        background: rgba(0, 0, 0, .05);
      }

      &[sd-selected=true] {
        background: white;
        border-color: var(--theme-grey-lighter);
      }
    }
  `]
})
export class SdTabItemControl {
  @Input()
  public value?: any;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(@Inject(forwardRef(() => SdTabControl))
                     private readonly _parentControl: SdTabControl) {
  }

  @HostListener("click")
  public onClick(): void {
    this._parentControl.setValue(this.value);
  }
}
