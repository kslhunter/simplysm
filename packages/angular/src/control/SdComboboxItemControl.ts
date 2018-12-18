import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Inject,
  Injector,
  Input
} from "@angular/core";
import {SdComboboxControl} from "./SdComboboxControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-combobox-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdComboboxItemControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
:host {
  display: block;
  padding: ${vars.gap.xs} ${vars.gap.lg} ${vars.gap.xs} ${vars.gap.sm};
  cursor: pointer;
  font-size: ${vars.fontSize.sm};

  &:hover {
    background: rgba(0, 0, 0, .1);
  }
}`;
  }

  @Input()
  public value?: any;

  public get content(): string {
    return this._elRef.nativeElement.innerText.trim();
  }

  public constructor(injector: Injector,
                     @Inject(forwardRef(() => SdComboboxControl))
                     private readonly _comboboxControl: SdComboboxControl,
                     private readonly _elRef: ElementRef<HTMLElement>) {
    super(injector);
  }

  @HostListener("click", ["$event"])
  public onClick(): void {
    this._comboboxControl.setValueFromItemControl(this.value, this);
  }
}