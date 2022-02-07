import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, HostListener, Inject, Input } from "@angular/core";
import { SdComboboxComponent } from "./sd-combobox.component";

@Component({
  selector: "sd-combobox-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      padding: var(--gap-sm) var(--gap-default);
      cursor: pointer;

      &:hover {
        background: rgba(0, 0, 0, .1);
      }
    }
  `]
})
export class SdComboboxItemComponent {
  @Input()
  public value?: any;

  public get content(): string {
    return (this._elRef.nativeElement as HTMLElement).innerText.trim();
  }

  public constructor(@Inject(forwardRef(() => SdComboboxComponent))
                     private readonly _comboboxControl: SdComboboxComponent,
                     private readonly _elRef: ElementRef) {
  }

  @HostListener("click", ["$event"])
  public onClick(event: MouseEvent): void {
    this._comboboxControl.setValueFromItemControl(this.value, this);
  }
}
