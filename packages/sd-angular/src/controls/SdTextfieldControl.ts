import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild
} from "@angular/core";
import { SdInputValidate } from "../commons/SdInputValidate";
import { DateOnly, DateTime, ObjectUtils, Time } from "@simplysm/sd-core-common";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

// TODO: HISTORY 기록을 통해 CTRL+Z 수동 구현

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="!multiline">
      <input #input
             *ngIf="disabled || !readonly"
             [type]="controlType"
             [value]="controlValue"
             [attr.placeholder]="placeholder"
             [disabled]="disabled"
             [required]="required"
             [attr.min]="min"
             [attr.max]="max"
             [attr.step]="controlStep"
             [attr.pattern]="pattern"
             [attr.class]="inputClass"
             [attr.style]="inputSafeStyle"
             (input)="onInput()"/>
      <div *ngIf="!disabled && readonly"
           [attr.class]="'_readonly ' + inputClass"
           [attr.style]="inputSafeStyle">
        <ng-content></ng-content>
        <div *ngIf="controlType === 'password'" class="sd-text-brightness-light">
          ****
        </div>
        <ng-container *ngIf="controlType !== 'password'">
          {{ controlValue }}
        </ng-container>
      </div>
    </ng-container>

    <ng-container *ngIf="multiline">
      <textarea #input
                [value]="controlValue"
                [attr.placeholder]="placeholder"
                [disabled]="disabled"
                [required]="required"
                [attr.rows]="rows"
                [attr.class]="inputClass"
                [attr.style]="inputSafeStyle"
                (input)="onInput()"></textarea>
    </ng-container>

    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      position: relative;

      > input,
      > textarea,
      > div._readonly {
        @include form-control-base();

        background: var(--theme-color-secondary-lightest);
        border: 1px solid var(--sd-border-color);
        border-radius: 2px;

        &::-webkit-input-placeholder {
          color: var(--text-brightness-lighter);
        }
      }


      > input:disabled,
      > textarea:disabled {
        background: var(--theme-color-grey-lightest);
        color: var(--text-brightness-light);
      }

      > input,
      > div._readonly {
        height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        &::-webkit-calendar-picker-indicator {
          margin: auto;
          //background: transparent;
          //color: var(--theme-color-secondary-default);
          cursor: pointer;
        }

        &[type=color] {
          padding-top: 1px;
          padding-bottom: 1px;
          min-width: 40px;
        }

        &:focus {
          outline: none;
          border-color: var(--theme-color-primary-default);
        }
      }

      &[sd-type=number] > input,
      &[sd-type=number] > div._readonly {
        text-align: right;
      }

      &[sd-inline=true] > input,
      &[sd-inline=true] > div._readonly,
      &[sd-inline=true] > textarea {
        display: inline-block;
        width: auto;
        vertical-align: top;
      }

      &[sd-size=sm] > input,
      &[sd-size=sm] > div._readonly,
      &[sd-size=sm] > textarea {
        padding: var(--gap-xs) var(--gap-sm);

        &[type=color] {
          padding-top: 1px;
          padding-bottom: 1px;
        }
      }

      &[sd-size=sm] > input,
      &[sd-size=sm] > div._readonly {
        height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }

      &[sd-size=lg] > input,
      &[sd-size=lg] > div._readonly,
      &[sd-size=lg] > textarea {
        padding: var(--gap-default) var(--gap-lg);

        &[type=color] {
          padding-top: 1px;
          padding-bottom: 1px;
        }
      }

      &[sd-size=lg] > input,
      &[sd-size=lg] > div._readonly {
        height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }


      &[sd-inset=true] > input,
      &[sd-inset=true] > div._readonly,
      &[sd-inset=true] > textarea {
        border: none;
        border-radius: 0;

        &:disabled {
          background: white !important;
          color: var(--text-brightness-default);
        }
      }

      &[sd-inset=true] > div._readonly {
        //background: white;
        color: var(--text-brightness-default);
      }

      &[sd-inset=true] {
        > input,
        > div._readonly {
          height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=sm] > input,
        &[sd-size=sm] > div._readonly {
          height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=lg] > input,
        &[sd-size=lg] > div._readonly {
          height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        > input:focus {
          outline: 1px solid var(--theme-color-primary-default);
          outline-offset: -1px;
        }
      }

      > ._invalid-indicator {
        display: none;
      }

      > input:invalid + ._invalid-indicator,
      > textarea:invalid + ._invalid-indicator,
      &[sd-invalid=true] > ._invalid-indicator {
        @include invalid-indicator();
      }
    }
  `]
})
export class SdTextfieldControl implements DoCheck, AfterViewInit {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["number", "text", "password", "date", "datetime", "datetime-sec", "time", "time-sec", "month", "year", "color", "email"],
    notnull: true
  })
  @HostBinding("attr.sd-type")
  public type: "number" | "text" | "password" | "date" | "datetime" | "datetime-sec" | "time" | "time-sec" | "month" | "year" | "color" | "email" = "text";

  @Input()
  @SdInputValidate(String)
  public placeholder?: string;

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
  public readonly?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdInputValidate(Number)
  public min?: number;

  @Input()
  @SdInputValidate(Number)
  public max?: number;

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
  @SdInputValidate(Boolean)
  public multiline?: boolean;

  @Input()
  @SdInputValidate(Number)
  public rows?: number;

  @Input()
  @SdInputValidate({
    type: [String, Boolean],
    includes: ["vertical", "horizontal", true, false]
  })
  public resize?: "vertical" | "horizontal" | boolean;

  @Input()
  @SdInputValidate(Function)
  public validatorFn?: (value: number | string | DateOnly | DateTime | Time | undefined) => string | void;

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

  @ViewChild("input", { static: false, read: ElementRef })
  public inputElRef?: ElementRef<HTMLTextAreaElement | HTMLInputElement>;

  public controlType = "text";
  public controlValue = "";
  public controlStep: number | string = "any";
  public inputSafeStyle: SafeHtml | undefined;
  public errorMessage = "";

  public constructor(private readonly _sanitization: DomSanitizer) {
  }

  public ngAfterViewInit(): void {
    this.errorMessage = this._validate();

    const inputEl = this.inputElRef?.nativeElement;
    if (inputEl) {
      inputEl.setCustomValidity(this.errorMessage);
    }
  }

  private readonly _prevData: { [key: string]: any } = {};

  public ngDoCheck(): void {
    const compare = (propName: keyof this) => {
      const isChanged = !ObjectUtils.equal(this._prevData[propName as string], this[propName]);
      if (isChanged) this._prevData[propName as string] = ObjectUtils.clone(this[propName]);
      return isChanged;
    };

    const isTypeChange = compare("type");
    const isValueChange = compare("value");
    const isStepChange = compare("step");
    const isInputStyleChange = compare("inputStyle");
    const isResizeChange = compare("resize");
    const isMultilineChange = compare("multiline");
    const isRequiredChange = compare("required");
    const isValidatorFnChange = compare("validatorFn");
    const isMaxChange = compare("max");
    const isMinChange = compare("min");

    // controlType
    if (isTypeChange) {
      this.controlType = this.type === "number" ? "text" :
        this.type === "datetime" ? "datetime-local" :
          this.type === "datetime-sec" ? "datetime-local" :
            this.type === "time-sec" ? "time" :
              this.type;
    }

    // controlValue
    if (isValueChange || isTypeChange) {
      if (this.value == null) {
        this.controlValue = "";
      }
      else if (this.type === "number" && typeof this.value === "number") {
        this.controlValue = this.value.toLocaleString(undefined, { maximumFractionDigits: 10 });
      }
      else if (this.type === "datetime" && this.value instanceof DateTime) {
        this.controlValue = this.value.toFormatString("yyyy-MM-ddTHH:mm");
      }
      else if (this.type === "datetime-sec" && this.value instanceof DateTime) {
        this.controlValue = this.value.toFormatString("yyyy-MM-ddTHH:mm:ss");
      }
      else if (this.type === "year" && this.value instanceof DateOnly) {
        this.controlValue = this.value.toFormatString("yyyy");
      }
      else if (this.type === "month" && this.value instanceof DateOnly) {
        this.controlValue = this.value.toFormatString("yyyy-MM");
      }
      else if (this.type === "date" && this.value instanceof DateOnly) {
        this.controlValue = this.value.toFormatString("yyyy-MM-dd");
      }
      else if (this.type === "time" && this.value instanceof DateOnly) {
        this.controlValue = this.value.toFormatString("HH:mm");
      }
      else if (this.type === "time-sec" && this.value instanceof DateOnly) {
        this.controlValue = this.value.toFormatString("HH:mm:ss");
      }
      else if (typeof this.value === "string") {
        this.controlValue = this.value;
      }
      else {
        throw new Error(`'sd-textfield'에 대한 'value'가 잘못되었습니다. (입력값: ${this.value?.toString()})`);
      }
    }

    // controlStep
    if (isStepChange || isTypeChange) {
      if (this.step !== undefined) {
        this.controlStep = this.step;
      }
      else if (this.type === "datetime-sec") {
        this.controlStep = 1;
      }
      else if (this.type === "time-sec") {
        this.controlStep = 1;
      }
      else {
        this.controlStep = "any";
      }
    }

    // inputStyleSafeHtml
    if (isInputStyleChange || isResizeChange || isMultilineChange) {
      if (this.multiline) {
        const controlResize = this.resize === "vertical" ? "vertical" :
          this.resize === "horizontal" ? "horizontal" :
            this.resize ? undefined : "none";

        this.inputSafeStyle = this._getSafeHtml((`resize: ${controlResize};`) + this.inputStyle);
      }
      else {
        this.inputSafeStyle = this._getSafeHtml(this.inputStyle);
      }
    }

    // errorMessages
    if (
      isValueChange ||
      isTypeChange ||
      isRequiredChange ||
      isValidatorFnChange ||
      isMaxChange ||
      isMinChange
    ) {
      this.errorMessage = this._validate();
    }
  }

  private _getSafeHtml(value?: string): SafeHtml | undefined {
    return value !== undefined ? this._sanitization.bypassSecurityTrustStyle(value) : undefined;
  }

  public onInput(): void {
    const inputEl = this.inputElRef!.nativeElement;

    if (!Boolean(inputEl.value)) {
      this.value = undefined;
    }
    else if (this.type === "number") {
      const inputValue = inputEl.value.replace(/,/g, "");
      const newValue = inputValue.endsWith(".") || Number.isNaN(Number(inputValue)) ? inputValue : Number(inputValue);
      this.value = newValue;

      if (this.value === newValue) {
        inputEl.value = newValue.toString();
      }
    }
    else if (["year", "month", "date"].includes(this.type)) {
      try {
        this.value = DateOnly.parse(inputEl.value);
      }
      catch (err) {
        this.value = inputEl.value;
      }
    }
    else if (["datetime", "datetime-sec"].includes(this.type)) {
      try {
        this.value = DateTime.parse(inputEl.value);
      }
      catch (err) {
        this.value = inputEl.value;
      }
    }
    else if (["time", "time-sec"].includes(this.type)) {
      try {
        this.value = Time.parse(inputEl.value);
      }
      catch (err) {
        this.value = inputEl.value;
      }
    }
    else {
      this.value = inputEl.value;
    }

    this.errorMessage = this._validate();
    inputEl.setCustomValidity(this.errorMessage);

    this.valueChange.emit(this.value);
  }

  private _validate(): string {
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

    if (errorMessages.length > 0 && this.validatorFn) {
      const message = this.validatorFn(this.value);
      if (message !== undefined) {
        errorMessages.push(message);
      }
    }

    return errorMessages.join("\r\n");
  }
}
