import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Injector,
  Input
} from "@angular/core";
import {SdSelectControl} from "./SdSelectControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdSelectItemControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: block;
        // padding: ${vars.gap.xs} ${vars.gap.sm};
        padding: ${vars.gap.sm} ${vars.gap.default};
        cursor: pointer;
        // font-size: font-size(sm);

        &:hover {
          background: ${vars.transColor.default};
        }
      }`;
  }

  @HostBinding("attr.tabindex")
  public tabIndex = 0;

  @Input()
  public value?: any;

  public get content(): string {
    return this._elRef.nativeElement.innerHTML.trim();
  }

  public constructor(injector: Injector,
                     @Inject(forwardRef(() => SdSelectControl))
                     private readonly _selectControl: SdSelectControl,
                     private readonly _elRef: ElementRef<HTMLElement>) {
    super(injector);
  }

  @HostListener("click", ["$event"])
  public onClick(): void {
    this._selectControl.setValue(this.value);
  }
}