import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, HostListener, Inject, Input} from "@angular/core";
import {SdTabControl} from "./SdTabControl";

@Component({
  selector: "sd-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      padding: var(--gap-sm) var(--gap-default);
      cursor: pointer;
      margin-bottom: -2px;

      @media not all and (pointer: coarse) {
        border-top: 2px solid transparent;
        border-left: 1px solid transparent;
        border-right: 1px solid transparent;

        &:hover {
          background: rgba(0, 0, 0, .05);
        }

        &[sd-selected=true] {
          background: white;
          border-color: var(--theme-grey-lighter);
        }
      }

      @media all and (pointer: coarse) {
        border-bottom: 2px solid transparent !important;
        font-weight: bold;
        color: var(--theme-grey-default);

        &[sd-selected=true] {
          border-bottom: 3px solid var(--theme-primary-default) !important;
          color: var(--theme-primary-default);
        }
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
