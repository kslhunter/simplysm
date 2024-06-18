import {ChangeDetectionStrategy, Component, ElementRef, forwardRef, HostListener, inject, Input} from "@angular/core";
import {SdComboboxControl} from "./SdComboboxControl";

@Component({
  selector: "sd-combobox-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
  ],
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
export class SdComboboxItemControl<T> {
  @Input()
  value!: T;

  get content(): string {
    return this.#elRef.nativeElement.innerText.trim();
  }

  #comboboxControl: SdComboboxControl<T> = inject(forwardRef(() => SdComboboxControl));
  #elRef: ElementRef<HTMLElement> = inject(ElementRef);

  @HostListener("click", ["$event"])
  public onClick(event: MouseEvent): void {
    this.#comboboxControl.setValueFromItemControl(this.value, this);
  }
}
