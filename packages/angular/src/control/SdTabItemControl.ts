import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, HostListener, Inject, Input} from "@angular/core";
import {SdTabControl} from "./SdTabControl";

@Component({
  selector: "sd-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: inline-block;
      padding: gap(sm) gap(default);
      cursor: pointer;

      &:hover {
        background: rgba(0, 0, 0, .05);
      }

      &[sd-selected=true] {
        background: theme-color(primary, default);
        color: text-color(reverse, default);
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