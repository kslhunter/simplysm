import {ChangeDetectionStrategy, Component, ElementRef, forwardRef, HostListener, Inject, Input} from "@angular/core";
import {SdComboboxControl} from "./SdComboboxControl";

@Component({
  selector: "sd-combobox-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      padding: gap(xs) gap(sm) * 2 gap(xs) gap(sm);
      cursor: pointer;
      font-size: font-size(sm);

      &:hover {
        background: trans-color(dark);
      }
    }
  `]
})
export class SdComboboxItemControl {
  @Input()
  public value?: any;

  public get content(): string {
    return this._elRef.nativeElement.innerText.trim();
  }

  public constructor(@Inject(forwardRef(() => SdComboboxControl))
                     private readonly _comboboxControl: SdComboboxControl,
                     private readonly _elRef: ElementRef<HTMLElement>) {
  }

  @HostListener("click", ["$event"])
  public onClick(): void {
    this._comboboxControl.setValueFromItemControl(this.value, this);
  }
}