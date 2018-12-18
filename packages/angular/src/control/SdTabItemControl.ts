import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Injector,
  Input
} from "@angular/core";
import {SdTabControl} from "./SdTabControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdTabItemControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: inline-block;
        padding: ${vars.gap.sm} ${vars.gap.default};
        cursor: pointer;

        &:hover {
          background: rgba(0, 0, 0, .05);
        }

        &[sd-selected=true] {
          background: ${vars.themeColor.primary.default};
          color: ${vars.textReverseColor.default};
        }
      }`;
  }

  @Input()
  public value?: any;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(injector: Injector,
                     @Inject(forwardRef(() => SdTabControl))
                     private readonly _parentControl: SdTabControl) {
    super(injector);
  }

  @HostListener("click")
  public onClick(): void {
    this._parentControl.setValue(this.value);
  }
}