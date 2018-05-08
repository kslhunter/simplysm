import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
  ViewChild
} from "@angular/core";
import {SdSizeString} from "../commons/types";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";

@Component({
  selector: "sd-combobox",
  template: `
    <sd-textfield #textField
                  type="text"
                  [size]="size"
                  [value]="text"
                  (valueChange)="onTextChange($event)"
                  [required]="required"
                  [disabled]="disabled"
                  [placeholder]="placeholder"
                  (keydown.ArrowDown)="onTextfieldArrowDownKeydown($event)"></sd-textfield>
    <div>
      <sd-icon icon="angle-down" [fixedWidth]="true"></sd-icon>
    </div>
    <sd-dropdown #dropdown [open]="open"
                 (keydown.ArrowUp)="onDropdownArrowUpKeydown($event)">
      <ng-content></ng-content>
    </sd-dropdown>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdComboboxControl}]
})
export class SdComboboxControl extends SdComponentBase {
  @Input()
  @SdTypeValidate(String)
  public text?: string;

  @Input()
  @SdTypeValidate("SdSizeString")
  @HostBinding("attr.sd-size")
  public size?: SdSizeString;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(String)
  public placeholder?: string;

  @Output()
  public readonly textChange = new EventEmitter<string | undefined>();

  @Output()
  public readonly blur = new EventEmitter<void>();

  @ViewChild("dropdown", {read: ElementRef})
  public dropdownElRef?: ElementRef<HTMLElement>;

  @ViewChild("textField", {read: ElementRef})
  public textFieldElRef?: ElementRef<HTMLElement>;

  public open = false;

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
    super();
  }

  @HostListener("focus")
  public onFocus(): void {
    this.open = true;
  }

  @HostListener("blur", ["$event"])
  public onBlur(event: FocusEvent): void {
    const thisEl = this._elRef.nativeElement;
    const relatedTargetEl = event.relatedTarget as HTMLElement;

    if (!thisEl.has(relatedTargetEl)) {
      this.open = false;
      this.blur.emit();
    }
  }

  public onTextChange(text?: string): void {
    this.text = text;
    this.textChange.emit(text);
  }

  public onTextfieldArrowDownKeydown(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const focusableEl = this.dropdownElRef!.nativeElement.findFocusable();
    if (focusableEl) {
      focusableEl.focus();
    }
  }

  public onDropdownArrowUpKeydown(event: KeyboardEvent): void {
    const firstFocusableEl = this.dropdownElRef!.nativeElement.findFocusable();
    if (document.activeElement === firstFocusableEl) {
      event.preventDefault();
      event.stopPropagation();
      this.textFieldElRef!.nativeElement.find("input")!.focus();
    }
  }
}
