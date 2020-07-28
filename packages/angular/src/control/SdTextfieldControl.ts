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
           [attr.type]="type === 'number' ? 'text' : type === 'datetime' ? 'datetime-local' : type"
           [required]="required"
           [value]="controlValue"
           [placeholder]="placeholder || ''"
           [attr.pattern]="pattern"
           [attr.sd-invalid]="getIsInvalid()"
           (input)="onInputInput($event)"
           (focus)="onFocus($event)"
           (blur)="onBlur($event)"
           [disabled]="disabled"
           [step]="step"
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
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["sm", "lg"].includes(value)
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdTypeValidate(Function)
  public validator?: (value: number | string | DateOnly | DateTime | Time) => boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public multiline?: boolean;

  @Input()
  @SdTypeValidate(Number)
  public maximumFractionDigits?: number;


  public getIsInvalid(): boolean {
    if (this.min !== undefined && this.value !== undefined && this.type === "number" && this.value < this.min) {
      return true;
    }
    else if (this.step !== undefined && this.value !== undefined && this.type === "number" && Math.abs(Number(this.value) % this.step) >= 1) {
      return true;
    }
    else if (this.required && (this.value === "" || this.value === undefined)) {
      return true;
    }
    else if (this.validator && this.value && !this.validator(this.value)) {
      return true;
    }

    return false;
  }

  public get controlValue(): number | string {
    return this.value === undefined ? ""
      : this.value instanceof DateTime ? this.value.toFormatString("yyyy-MM-ddTHH:mm")
        : this.value instanceof DateOnly ? (this.type === "month" ? this.value.toFormatString("yyyy-MM") : this.value.toString())
          : this.value instanceof Time ? this.value.toFormatString("HH:mm")
            : this.type === "number" && typeof this.value === "number" ? this.value.toLocaleString(undefined, {maximumFractionDigits: this.maximumFractionDigits || 10})
              : this.value;
  }

  public onInputInput(event: Event): void {
    let errorMessage = "";

    const inputEl = event.target as (HTMLInputElement | HTMLTextAreaElement);

    if (!inputEl.value) {
      this.value = undefined;
    }
    else if (this.type === "number") {
      const inputValue = inputEl.value.replace(/,/g, "");
      const newValue = inputValue.endsWith(".") || (inputValue.includes(".") && inputValue.endsWith("0")) || Number.isNaN(Number(inputValue)) ? inputValue : Number(inputValue);
      this.value = newValue;

      if (this.value === newValue) {
        inputEl.value = newValue.toString();
      }

      if (typeof this.value !== "number") {
        errorMessage = "숫자를 입력하세요";
      }
      else {
        errorMessage = "";
      }
    }
    else if (["year", "month", "date"].includes(this.type)) {
      try {
        this.value = DateOnly.parse(inputEl.value);
      }
      catch (err) {
        this.value = inputEl.value;
      }

      if (!(this.value instanceof DateOnly)) {
        errorMessage = "날짜를 입력하세요";
      }
      else {
        errorMessage = "";
      }
    }
    else if (["datetime", "datetime-sec"].includes(this.type)) {
      try {
        this.value = DateTime.parse(inputEl.value);
      }
      catch (err) {
        this.value = inputEl.value;
      }

      if (!(this.value instanceof DateTime)) {
        errorMessage = "날짜 및 시간을 입력하세요";
      }
      else {
        errorMessage = "";
      }
    }
    else if (["time", "time-sec"].includes(this.type)) {
      try {
        this.value = Time.parse(inputEl.value);
      }
      catch (err) {
        this.value = inputEl.value;
      }

      if (!(this.value instanceof Time)) {
        errorMessage = "시간을 입력하세요";
      }
      else {
        errorMessage = "";
      }
    }
    else {
      this.value = inputEl.value;
    }

    inputEl.setCustomValidity(errorMessage);

    this.valueChange.emit(this.value);
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
      }
      else {
        if (document.activeElement === this.inputElRef.nativeElement) {
          this.inputElRef.nativeElement.blur();
        }
      }
    }
  }
}
