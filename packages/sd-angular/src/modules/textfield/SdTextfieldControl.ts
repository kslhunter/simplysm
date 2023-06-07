import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "../../commons/SdNotifyPropertyChange";
import {DateOnly, DateTime, Time} from "@simplysm/sd-core";

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <input #input
           [tabindex]="tabindex"
           [attr.type]="type === 'number' ? 'text' : type === 'datetime' ? 'datetime-local' : type"
           [required]="required"
           [value]="controlValue"
           [placeholder]="placeholder || ''"
           [attr.pattern]="pattern"
           [attr.inputmode]="type === 'number' ? 'numeric' : undefined"
           [attr.sd-invalid]="getIsInvalid()"
           (input)="onInputInput($event)"
           (focus)="onFocus($event)"
           (blur)="onBlur($event)"
           [disabled]="disabled"
           [style.text-align]="type === 'number' ? 'right' : undefined"
           [step]="step"
           *ngIf="!multiline"/>
    <textarea #input
              [tabindex]="tabindex"
              [rows]="rows"
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
              [style.resize]="resize === 'v' ? 'vertical' : resize === 'h' ? 'horizontal' : resize ? '' : 'none'"
              *ngIf="multiline"></textarea>
    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";
    @import "../../../scss/variables-scss";

    sd-textfield {
      display: block;
      position: relative;

      > input,
      > textarea {
        @include form-control-base();
        //background-clip: padding-box;
        border-radius: 0;
        margin: 0;

        background-color: var(--theme-secondary-lightest);
        border-color: var(--trans-color-default);
        transition: outline-color .1s linear;
        outline: 1px solid transparent;
        outline-offset: -1px;

        &::-webkit-input-placeholder {
          color: var(--text-color-lighter);
        }

        //&::-webkit-outer-spin-button,
        //&::-webkit-inner-spin-button {
        //  -webkit-appearance: none;
        //  margin: 0;
        //}
        //
        &::-webkit-calendar-picker-indicator {
          //background: transparent;
          color: var(--text-color-default);
          cursor: pointer;
        }

        &:focus {
          outline-color: var(--theme-primary-default);
        }

        &:disabled {
          background: var(--theme-grey-lightest) !important;
          color: var(--text-color-light);
        }

        &[type='color'] {
          padding: 1px var(--gap-default) !important;
          height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip) + 2px);
        }

        &[type=year],
        &[type=month],
        &[type=date],
        &[type=datetime],
        &[type=time],
        &[type=datetime-local] {
          padding: calc(var(--gap-sm) - 1px) var(--gap-default);
        }
      }

      > ._invalid-indicator {
        display: none;
      }

      > input[sd-invalid=true] + ._invalid-indicator,
      > input:invalid + ._invalid-indicator {
        @include invalid-indicator();
      }

      &[sd-inset=true] {
        height: 100%;

        > input,
        > textarea {
          display: block;
          border: none;
        }

        > textarea {
          height: 100%;
          resize: none;
        }
      }

      &[sd-inline=true] {
        display: inline-block;
      }

      &[sd-size=sm] > input,
      &[sd-size=sm] > textarea {
        padding: var(--gap-xs) var(--gap-sm);
      }

      &[sd-size=lg] > input,
      &[sd-size=lg] > textarea {
        padding: var(--gap-default) var(--gap-lg);
      }

      @each $color in $arr-theme-color {
        @each $brightness in $arr-theme-brightness {
          &.sd-text-color-#{$color}-#{$brightness} {
            > input,
            > textarea {
              color: var(--theme-#{$color}-#{$brightness}) !important;
            }
          }
        }
      }

      /*@media screen and (max-width: $screen-mobile-width) {
        > input {
          &[type=year],
          &[type=month],
          &[type=date],
          &[type=datetime],
          &[type=time],
          &[type=datetime-local] {
            padding: calc((var(--font-size-default) * var(--line-height-strip) - var(--font-size-default)) / 2 + var(--gap-sm)) var(--gap-default);
            !*height: calc(var(--font-size-default) * var(--line-height-strip) + var(--gap-sm) + var(--gap-sm) + 2px);*!
          }
        }
      }*/
    }
  `]
})
export class SdTextfieldControl implements ISdNotifyPropertyChange {
  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["number", "text", "password", "date", "datetime", "time", "month", "year", "color", "email"],
    notnull: true
  })
  public type: "number" | "text" | "password" | "date" | "datetime" | "time" | "month" | "year" | "color" | "email" = "text";

  @Input()
  @SdTypeValidate(String)
  public placeholder?: string;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate([Number, String, DateOnly, DateTime, Time])
  @SdNotifyPropertyChange()
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
  public tabindex?: number;

  @Input()
  @SdTypeValidate(Number)
  public step?: number;

  @Input()
  @SdTypeValidate(String)
  public pattern?: string;

  @ViewChild("input", {static: true})
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
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdTypeValidate(Boolean)
  public multiline?: boolean;

  @Input()
  @SdTypeValidate(Number)
  public rows?: number;

  @Input()
  @SdTypeValidate({
    type: [String, Boolean],
    includes: ["v", "h", true, false]
  })
  public resize?: "v" | "h" | boolean;

  @Input()
  @SdTypeValidate(Function)
  public validator?: (value: number | string | DateOnly | DateTime | Time) => boolean;

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
      : this.value instanceof DateTime ? (this.value.second ? this.value.toFormatString("yyyy-MM-ddTHH:mm:ss") : this.value.toFormatString("yyyy-MM-ddTHH:mm"))
        : this.value instanceof DateOnly ? ((this.type === "year" && this.value instanceof DateOnly) ? this.value.toFormatString("yyyy") : this.type === "month" ? this.value.toFormatString("yyyy-MM") : this.value.toString())
          : this.value instanceof Time ? (this.value.second ? this.value.toFormatString("HH:mm:ss") : this.value.toFormatString("HH:mm"))
            : this.type === "number" && typeof this.value === "number" ? this.value.toLocaleString(undefined, {maximumFractionDigits: 10})
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
    if (window.innerWidth < 520 && event.target && event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      event.target.select();
    }

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

    if (this.type === "number") {
      const inputEl = event.target as (HTMLInputElement | HTMLTextAreaElement);
      const inputValue = inputEl.value.replace(/,/g, "");
      const newValue = !inputValue || inputValue.endsWith(".") || Number.isNaN(Number(inputValue)) ? inputValue : Number(inputValue);
      this.value = newValue === "" ? undefined : newValue;

      if (this.value === newValue) {
        inputEl.value = newValue.toString();
      }

      if (this.value !== undefined && typeof this.value !== "number") {
        inputEl.setCustomValidity("숫자를 입력하세요");
      }
      else {
        inputEl.setCustomValidity("");
      }
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
