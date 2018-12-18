import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild
} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../decorator/SdNotifyPropertyChange";
import {DateOnly, DateTime, Time} from "@simplism/core";


@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input #input
           [type]="type === 'number' ? 'text' : type === 'datetime' ? 'datetime-local' : type"
           [required]="required"
           [value]="controlValue"
           [placeholder]="placeholder || ''"
           [attr.pattern]="pattern"
           [attr.sd-invalid]="getIsInvalid()"
           (input)="onInputInput($event)"
           (focus)="onFocus($event)"
           (blur)="onBlur($event)"
           [disabled]="disabled"
           [style.text-align]="type === 'number' ? 'right' : undefined"
           *ngIf="!multiline"/>
    <textarea #input
              [required]="required"
              [value]="controlValue"
              [placeholder]="placeholder || ''"
              [attr.pattern]="pattern"
              [attr.sd-invalid]="getIsInvalid()"
              (input)="onInputInput($event)"
              (focus)="onFocus($event)"
              (blur)="onBlur($event)"
              [disabled]="disabled"
              [style.text-align]="type === 'number' ? 'right' : undefined"
              *ngIf="multiline"></textarea>
    <div class="_invalid-indicator"></div>`
})
export class SdTextfieldControl implements ISdNotifyPropertyChange {


  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["number", "text", "password", "date", "datetime", "time", "month", "color", "email"].includes(value),
    notnull: true
  })
  public type: "number" | "text" | "password" | "date" | "datetime" | "time" | "month" | "color" | "email" = "text";

  @Input()
  @SdTypeValidate(String)
  public placeholder?: string;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate([Number, String, DateOnly, DateTime, Time])
  public value?: number | string | DateOnly | DateTime | Time;

  @Output()
  public readonly valueChange = new EventEmitter<string | number | DateOnly | DateTime | Time | undefined>();

  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @SdNotifyPropertyChange()
  public focused = false;

  @Output()
  public readonly focusedChange = new EventEmitter<boolean>();

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdTypeValidate(Number)
  public min?: number;

  @Input()
  @SdTypeValidate(Number)
  public step?: number;

  @Input()
  @SdTypeValidate(String)
  public pattern?: string;

  @ViewChild("input")
  public inputElRef?: ElementRef<HTMLInputElement | HTMLTextAreaElement>;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public multiline?: boolean;


  public getIsInvalid(): boolean {
    const hasMinError = this.min !== undefined && this.value !== undefined && this.type === "number" && this.value < this.min;
    const hasStepError = this.step !== undefined && this.value !== undefined && this.type === "number" && Math.abs(Number(this.value) % this.step) >= 1;
    return hasMinError || hasStepError;
  }

  public get controlValue(): number | string {
    return this.value === undefined ? ""
      : this.value instanceof DateTime ? this.value.toFormatString("yyyy-MM-ddTHH:mm")
        : this.value instanceof DateOnly ? (this.type === "month" ? this.value.toFormatString("yyyy-MM") : this.value.toString())
          : this.value instanceof Time ? this.value.toFormatString("HH:mm")
            : this.type === "number" && typeof this.value === "number" ? this.value.toLocaleString()
              : this.value;
  }

  public onInputInput(event: Event): void {
    const inputEl = event.target as (HTMLInputElement | HTMLTextAreaElement);
    let value;
    if (this.type === "number") {
      value = !inputEl.value ? undefined : Number(inputEl.value.replace(/,/g, ""));
    } else if (this.type === "date" || this.type === "month") {
      value = !inputEl.value ? undefined : DateOnly.parse(inputEl.value);
    } else if (this.type === "datetime") {
      value = !inputEl.value ? undefined : DateTime.parse(inputEl.value);
    } else if (this.type === "time") {
      value = !inputEl.value ? undefined : Time.parse(inputEl.value);
    } else {
      value = inputEl.value;
    }

    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(this.value);
    }
  }

  public onFocus(event: Event): void {
    event.preventDefault();
    if (!this.focused) {
      this.focused = true;
      this.focusedChange.emit(this.focused);
    }
  }

  public onBlur(event: Event): void {
    event.preventDefault();
    if (this.focused) {
      this.focused = false;
      this.focusedChange.emit(false);
    }
  }

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    if (propertyName === "focused" && this.inputElRef) {
      if (newValue) {
        if (document.activeElement !== this.inputElRef.nativeElement) {
          this.inputElRef.nativeElement.focus();
        }
      } else {
        if (document.activeElement === this.inputElRef.nativeElement) {
          this.inputElRef.nativeElement.blur();
        }
      }
    }
  }
}