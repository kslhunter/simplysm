import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Input
} from "@angular/core";
import { SdmTabControl } from "./SdmTabControl";

@Component({
  selector: "sdm-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: inline-block;
      padding: var(--gap-sm) var(--gap-default);
      cursor: pointer;
      margin-bottom: -2px;

      border-bottom: 2px solid transparent !important;
      font-weight: bold;
      color: var(--theme-color-grey-default);

      &[sd-selected=true] {
        border-bottom: 3px solid var(--theme-color-primary-default) !important;
        color: var(--theme-color-primary-default);
      }
    }
  `]
})
export class SdmTabItemControl {
  @Input()
  public value?: any;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(@Inject(forwardRef(() => SdmTabControl))
                     private readonly _parentControl: SdmTabControl) {
  }

  @HostListener("click")
  public onClick(): void {
    this._parentControl.setValue(this.value);
  }
}
