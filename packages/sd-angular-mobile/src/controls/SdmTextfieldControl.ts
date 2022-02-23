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
import { SdInputValidate } from "@simplysm/sd-angular";
import { DateOnly, DateTime, StringUtil, Time } from "@simplysm/sd-core-common";

@Component({
  selector: "sdm-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input #input
           [type]="controlType"
           [value]="controlValue"
           [required]="required"
           [disabled]="disabled"
           [attr.placeholder]="placeholder"
           [attr.min]="min"
           [attr.max]="max"
           [attr.minlength]="minlength"
           [attr.maxlength]="maxlength"
           [attr.step]="controlStep"
           [attr.pattern]="pattern"
           [attr.class]="inputClass"
           [attr.style]="inputStyle"
           [attr.title]="title || placeholder"
           (input)="onInput()"
           [attr.inputmode]="controlInputMode"/>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;

      > input {
        width: 100%;
        padding: calc(var(--gap-sm) + 1px) 0 calc(var(--gap-sm) - 1px);
        border: none;
        border-bottom: 2px solid var(--sd-border-color);
        background: transparent;

        font-size: var(--font-size-default);
        font-family: var(--font-family);
        line-height: var(--line-height);

        color: var(--text-brightness-default);

        &::-webkit-input-placeholder {
          color: var(--text-brightness-lighter);
        }

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        &::-webkit-calendar-picker-indicator {
          margin: auto;
        }

        transition: border-color 0.3s;
      }

      &[sd-invalid=true] {
        > input {
          border-bottom-color: var(--theme-color-danger-default);
        }
      }

      > input {
        &:focus {
          border-color: var(--theme-color-primary-default);
        }

        &:disabled {
          border-bottom-color: transparent;
          color: var(--text-brightness-light);
        }
      }

      &[sd-type=number] {
        > input {
          text-align: right;
        }
      }

      &[sd-size=sm] {
        > input {
          padding: calc(var(--gap-xs) + 1px) 0 calc(var(--gap-xs) - 1px);
        }
      }

      &[sd-size=lg] {
        > input {
          font-size: var(--font-size-lg);
          padding: calc(var(--gap-default) + 1px) 0 calc(var(--gap-default) - 1px);
        }
      }

      &[sd-inline=true] {
        display: inline-block;

        > input {
          display: inline-block;
          width: auto;
        }
      }

      &[sd-inset=true] {
        > input {
          border: none;

          &:focus {
            outline: 1px solid var(--theme-color-primary-default);
          }

          padding: var(--gap-sm) 0;
        }
        
        &[sd-size=sm] {
          > input {
            padding: var(--gap-xs) 0;
          }
        }
        &[sd-size=lg] {
          > input {
            padding: var(--gap-default) 0;
          }
        }
      }
    }`]
})
export class SdmTextfieldControl {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["number", "text", "password", "date", "datetime", "datetime-sec", "time", "time-sec", "month", "year", "color", "email", "brn"],
    notnull: true
  })
  @HostBinding("attr.sd-type")
  public type: "number" | "text" | "password" | "date" | "datetime" | "datetime-sec" | "time" | "time-sec" | "month" | "year" | "color" | "email" | "brn" = "text";

  @Input()
  @SdInputValidate(String)
  public placeholder?: string;

  @Input()
  @SdInputValidate(String)
  public title?: string;

  @Input()
  @SdInputValidate([Number, String, DateOnly, DateTime, Time])
  public value?: number | string | DateOnly | DateTime | Time;

  @Output()
  public readonly valueChange = new EventEmitter<number | string | DateOnly | DateTime | Time | undefined>();

  @Input()
  @SdInputValidate(Boolean)
  public disabled?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdInputValidate(Number)
  public min?: number;

  @Input()
  @SdInputValidate(Number)
  public max?: number;

  @Input()
  @SdInputValidate(Number)
  public minlength?: number;

  @Input()
  @SdInputValidate(Number)
  public maxlength?: number;

  /**
   * 10, 1, 0.1, 0.01, 0.01 방식으로 입력
   */
  @Input()
  @SdInputValidate(Number)
  public step?: number;

  @Input()
  @SdInputValidate(String)
  public pattern?: string;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdInputValidate(Function)
  public validatorFn?: (value: number | string | DateOnly | DateTime | Time | undefined) => string | undefined;

  @Input("input.style")
  @SdInputValidate(String)
  public inputStyle?: string;

  @Input("input.class")
  @SdInputValidate(String)
  public inputClass?: string;

  @HostBinding("attr.sd-invalid")
  public get isInvalid(): boolean {
    return Boolean(this.errorMessage);
  }

  @Input()
  @SdInputValidate(Boolean)
  public useNumberComma = true;

  @ViewChild("input", { static: false, read: ElementRef })
  public inputElRef?: ElementRef<HTMLTextAreaElement | HTMLInputElement>;

  public get controlType(): string {
    return this.type === "number" ? "text"
      : this.type === "brn" ? "text"
        : this.type === "datetime" ? "datetime-local"
          : this.type === "datetime-sec" ? "datetime-local"
            : this.type === "time-sec" ? "time"
              : this.type;
  }

  public get controlInputMode(): string | undefined {
    return this.type === "number" ? "numeric" : undefined;
  }

  public get controlValue(): string {
    if (this.value == null) {
      return "";
    }

    if (this.type === "number" && typeof this.value === "number") {
      return this.useNumberComma ? this.value.toLocaleString(undefined, { maximumFractionDigits: 10 }) : this.value.toString(10);
    }
    if (this.type === "brn" && typeof this.value === "string") {
      const str = this.value.replace(/[^0-9]/g, "");
      const first = str.substring(0, 3);
      const second = str.substring(3, 5);
      const third = str.substring(5, 10);
      return first
        + (
          StringUtil.isNullOrEmpty(second) ? "" : "-" + second
            + (
              StringUtil.isNullOrEmpty(third) ? "" : "-" + third
            )
        );
    }
    if (this.type === "datetime" && this.value instanceof DateTime) {
      return this.value.toFormatString("yyyy-MM-ddTHH:mm");
    }
    if (this.type === "datetime-sec" && this.value instanceof DateTime) {
      return this.value.toFormatString("yyyy-MM-ddTHH:mm:ss");
    }
    if (this.type === "year" && this.value instanceof DateOnly) {
      return this.value.toFormatString("yyyy");
    }
    if (this.type === "month" && this.value instanceof DateOnly) {
      return this.value.toFormatString("yyyy-MM");
    }
    if (this.type === "date" && this.value instanceof DateOnly) {
      return this.value.toFormatString("yyyy-MM-dd");
    }
    if (this.type === "time" && (this.value instanceof DateTime || this.value instanceof Time)) {
      return this.value.toFormatString("HH:mm");
    }
    if (this.type === "time-sec" && (this.value instanceof DateTime || this.value instanceof Time)) {
      return this.value.toFormatString("HH:mm:ss");
    }
    if (typeof this.value === "string") {
      return this.value;
    }

    throw new Error(`'sd-textfield'에 대한 'value'가 잘못되었습니다. (입력값: ${this.value.toString()})`);
  }

  public get controlStep(): number | string {
    if (this.step !== undefined) {
      return this.step;
    }
    if (this.type === "datetime-sec" || this.type === "time-sec") {
      return 1;
    }
    return "any";
  }

  public get errorMessage(): string {
    const errorMessages: string[] = [];

    if (this.value == null) {
      if (this.required) {
        errorMessages.push("값을 입력하세요.");
      }
    }
    else if (this.type === "number") {
      if (typeof this.value !== "number") {
        errorMessages.push("숫자를 입력하세요");
      }
      if (this.min !== undefined && this.min > this.value) {
        errorMessages.push(`${this.min}보다 크거나 같아야 합니다.`);
      }
      if (this.max !== undefined && this.max < this.value) {
        errorMessages.push(`${this.max}보다 작거나 같아야 합니다.`);
      }
    }
    else if (this.type === "brn") {
      if (typeof this.value !== "string" || !(/^[0-9]{10}$/).test(this.value)) {
        errorMessages.push("BRN 형식이 잘못되었습니다.");
      }
    }
    else if (["year", "month", "date"].includes(this.type)) {
      if (!(this.value instanceof DateOnly)) {
        errorMessages.push("날짜를 입력하세요");
      }
    }
    else if (["datetime", "datetime-sec"].includes(this.type)) {
      if (!(this.value instanceof DateTime)) {
        errorMessages.push("날짜 및 시간을 입력하세요");
      }
    }
    else if (["time", "time-sec"].includes(this.type)) {
      if (!(this.value instanceof Time)) {
        errorMessages.push("시간을 입력하세요");
      }
    }
    else if (this.type === "text") {
      if (this.minlength !== undefined && this.minlength > (this.value as string).length) {
        errorMessages.push(`문자의 길이가 ${this.minlength}보다 길거나 같아야 합니다.`);
      }
      if (this.maxlength !== undefined && this.maxlength > (this.value as string).length) {
        errorMessages.push(`문자의 길이가 ${this.maxlength}보다 짧거나 같아야 합니다.`);
      }
    }

    if (this.validatorFn) {
      const message = this.validatorFn(this.value);
      if (message !== undefined) {
        errorMessages.push(message);
      }
    }

    const errorMessage = errorMessages.join("\r\n");

    const inputEl = this.inputElRef?.nativeElement;
    if (inputEl) {
      inputEl.setCustomValidity(errorMessage);
    }

    return errorMessage;
  }

  public onInput(): void {
    const inputEl = this.inputElRef!.nativeElement;

    if (inputEl.value === "") {
      this._setValue(undefined);
    }
    else if (this.type === "number") {
      const inputValue = inputEl.value.replace(/[^0-9-.]/g, "");
      if (
        Number.isNaN(Number(inputValue))
        || inputValue.endsWith(".")
        || (
          inputValue.includes(".")
          && Number(inputValue) === 0
        )
      ) {
      }
      else {
        this._setValue(Number(inputValue));
      }
    }
    else if (this.type === "brn") {
      this._setValue(inputEl.value.replace(/[^0-9]/g, ""));
    }
    else if (["year", "month", "date"].includes(this.type)) {
      try {
        this._setValue(DateOnly.parse(inputEl.value));
      }
      catch (err) {
      }
    }
    else if (["datetime", "datetime-sec"].includes(this.type)) {
      try {
        this._setValue(DateTime.parse(inputEl.value));
      }
      catch (err) {
      }
    }
    else if (["time", "time-sec"].includes(this.type)) {
      try {
        this._setValue(Time.parse(inputEl.value));
      }
      catch (err) {
      }
    }
    else {
      this._setValue(inputEl.value);
    }
  }

  private _setValue(newValue: any): void {
    if (this.valueChange.observers.length > 0) {
      this.valueChange.emit(newValue);
    }
    else {
      this.value = newValue;
    }
  }
}
