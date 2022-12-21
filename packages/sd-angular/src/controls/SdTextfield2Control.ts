import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output
} from "@angular/core";
import { DateOnly, DateTime, ObjectUtil, StringUtil, Time } from "@simplysm/sd-core-common";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { sdThemes, TSdTheme } from "../commons";

@Component({
  selector: "sd-textfield2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_contents"
         [style]="inputStyle"
         [attr.title]="title ?? placeholder">
      <div *ngIf="controlType === 'password'" class="sd-text-brightness-light">
        ****
      </div>
      <ng-container *ngIf="controlType !== 'password'">
        <ng-container *ngIf="controlValue">
          <pre>{{ controlValueText }}</pre>
        </ng-container>
        <ng-container *ngIf="!controlValue">
          <span class="sd-text-brightness-lighter">{{ placeholder }}</span>
        </ng-container>
      </ng-container>
    </div>
    <input *ngIf="!readonly && !disabled"
           [type]="controlType"
           [value]="controlValue"
           [attr.placeholder]="placeholder"
           [required]="required"
           [attr.min]="min"
           [attr.max]="max"
           [attr.minlength]="minlength"
           [attr.maxlength]="maxlength"
           [attr.step]="controlStep"
           [attr.pattern]="pattern"
           [attr.title]="title ?? placeholder"
           (input)="onInput($event)"
           [attr.inputmode]="type === 'number' ? 'numeric' : undefined"
           [style]="inputStyle"/>

    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    @import "../../scss/variables-scss-arr";

    :host {
      display: block;
      position: relative;

      > input,
      > ._contents {
        @include form-control-base2();

        border: 1px solid var(--trans-brightness-light);
        border-radius: var(--border-radius-default);
        background: var(--theme-color-secondary-lightest);
        height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        overflow: auto;
        width: 100%;

        &::-webkit-scrollbar {
          display: none;
        }

        &::-webkit-input-placeholder {
          color: var(--text-brightness-lighter);
        }

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        &::-webkit-calendar-picker-indicator {
          cursor: pointer;
          margin: auto;
        }

        &:focus {
          outline: none;
          border-color: var(--theme-color-primary-default);
        }
      }

      > ._contents {
        display: none;
      }

      &[sd-type=number] {
        > input,
        > ._contents {
          text-align: right;
        }
      }

      @each $theme in $arr-theme-color {
        &[sd-theme=#{$theme}] {
          > input,
          > ._contents {
            background: var(--theme-color-#{$theme}-lightest);
          }
        }
      }

      &[sd-size=sm] {
        > input,
        > ._contents {
          padding: var(--gap-xs) var(--gap-sm);
          height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
          min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

          &[type=color] {
            padding-top: 1px;
            padding-bottom: 1px;
          }
        }
      }

      &[sd-size=lg] {
        > input,
        > ._contents {
          padding: var(--gap-default) var(--gap-lg);
          height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
          min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

          &[type=color] {
            padding-top: 1px;
            padding-bottom: 1px;
          }
        }
      }

      &[sd-inline=true] {
        display: inline-block;
        vertical-align: top;

        > input,
        > ._contents {
          width: auto;
          vertical-align: top;
        }
      }

      &[sd-inset=true] {
        > ._contents {
          display: block;
        }

        > input {
          position: absolute;
          top: 0;
          left: 0;
        }

        > input,
        > ._contents {
          width: 100%;
          border: none;
          border-radius: 0;
          height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=sm] {
          > input,
          > ._contents {
            height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
            min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }
        }

        &[sd-size=lg] {
          > input,
          > ._contents {
            height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
            min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }
        }

        > input:focus {
          outline: 1px solid var(--theme-color-primary-default);
          outline-offset: -1px;
        }
      }


      &[sd-disabled=true] {
        > ._contents {
          display: block;
          background: var(--theme-color-grey-lightest);
          color: var(--text-brightness-light);
        }

        &[sd-inset=true] {
          > ._contents {
            background: white;
            color: var(--text-brightness-default);
          }
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
export class SdTextfield2Control implements DoCheck {
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
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-readonly")
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

  @Input()
  @SdInputValidate({
    type: String,
    includes: sdThemes
  })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme;

  @Input()
  public inputStyle?: any;

  @HostBinding("attr.sd-invalid")
  public get isInvalid(): boolean {
    return Boolean(this.errorMessage);
  }

  @Input()
  @SdInputValidate(Boolean)
  public useNumberComma = true;

  public controlType = "text";
  public controlValue = "";
  public controlStep: number | string = "any";
  public errorMessage = "";
  public controlValueText = "";

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public ngDoCheck(): void {
    this._onDoCheckControlType();
    this._onDoCheckControlStep();
    this._onDoCheckControlValue();
    this._onDoCheckErrorMessage();
  }

  private _onDoCheckControlType(): void {
    const record = {
      type: this.type
    };
    if (ObjectUtil.equal(this._prevData["recordForControlType"], record)) return;
    this._prevData["recordForControlType"] = record;

    this.controlType = record.type === "number" ? "text"
      : record.type === "brn" ? "text"
        : record.type === "datetime" ? "datetime-local"
          : record.type === "datetime-sec" ? "datetime-local"
            : record.type === "time-sec" ? "time"
              : record.type;
  }

  private readonly _prevData: Record<string, any> = {};

  private _onDoCheckControlValue(): void {
    const record = {
      type: this.type,
      value: this.value,
      useNumberComma: this.useNumberComma
    };
    if (ObjectUtil.equal(this._prevData["recordForControlValue"], record)) return;
    this._prevData["recordForControlValue"] = record;

    if (record.value == null) {
      this.controlValue = "";
      this.controlValueText = this.controlValue;
    }
    else if (record.type === "number" && typeof record.value === "number") {
      this.controlValue = record.useNumberComma ? record.value.toLocaleString(undefined, { maximumFractionDigits: 10 }) : record.value.toString(10);
      this.controlValueText = this.controlValue;
    }
    else if (record.type === "brn" && typeof record.value === "string") {
      const str = record.value.replace(/[^0-9]/g, "");
      const first = str.substring(0, 3);
      const second = str.substring(3, 5);
      const third = str.substring(5, 10);
      this.controlValue = first
        + (
          StringUtil.isNullOrEmpty(second) ? "" : "-" + second
            + (
              StringUtil.isNullOrEmpty(third) ? "" : "-" + third
            )
        );
      this.controlValueText = this.controlValue;
    }
    else if (record.type === "datetime" && record.value instanceof DateTime) {
      this.controlValue = record.value.toFormatString("yyyy-MM-ddTHH:mm");
      this.controlValueText = record.value.toFormatString("yyyy-MM-dd tt hh:mm");
    }
    else if (record.type === "datetime-sec" && record.value instanceof DateTime) {
      this.controlValue = record.value.toFormatString("yyyy-MM-ddTHH:mm:ss");
      this.controlValueText = record.value.toFormatString("yyyy-MM-dd tt hh:mm:ss");
    }
    else if (record.type === "year" && record.value instanceof DateOnly) {
      this.controlValue = record.value.toFormatString("yyyy");
      this.controlValueText = this.controlValue;
    }
    else if (record.type === "month" && record.value instanceof DateOnly) {
      this.controlValue = record.value.toFormatString("yyyy-MM");
      this.controlValueText = this.controlValue;
    }
    else if (record.type === "date" && record.value instanceof DateOnly) {
      this.controlValue = record.value.toFormatString("yyyy-MM-dd");
      this.controlValueText = this.controlValue;
    }
    else if (record.type === "time" && (record.value instanceof DateTime || record.value instanceof Time)) {
      this.controlValue = record.value.toFormatString("HH:mm");
      this.controlValueText = record.value.toFormatString("tt hh:mm");
    }
    else if (record.type === "time-sec" && (record.value instanceof DateTime || record.value instanceof Time)) {
      this.controlValue = record.value.toFormatString("HH:mm:ss");
      this.controlValueText = record.value.toFormatString("tt hh:mm:ss");
    }
    else if (typeof record.value === "string") {
      this.controlValue = record.value;
      this.controlValueText = this.controlValue;
    }
    else {
      throw new Error(`'sd-textfield2'에 대한 'value'가 잘못되었습니다. (입력값: ${record.value.toString()})`);
    }
  }

  private _onDoCheckControlStep(): void {
    const record = {
      type: this.type,
      step: this.step
    };
    if (ObjectUtil.equal(this._prevData["recordForControlStep"], record)) return;
    this._prevData["recordForControlStep"] = record;

    if (record.step !== undefined) {
      this.controlStep = record.step;
    }
    else if (record.type === "datetime-sec" || record.type === "time-sec") {
      this.controlStep = 1;
    }
    else {
      this.controlStep = "any";
    }
  }

  private _onDoCheckErrorMessage(): void {
    const record = {
      type: this.type,
      value: this.value,
      required: this.required,
      min: this.min,
      max: this.max,
      minlength: this.minlength,
      maxlength: this.maxlength,
      validatorFn: this.validatorFn
    };
    if (ObjectUtil.equal(this._prevData["recordForErrorMessage"], record)) return;
    this._prevData["recordForErrorMessage"] = record;

    const errorMessages: string[] = [];
    if (record.value == null) {
      if (record.required) {
        errorMessages.push("값을 입력하세요.");
      }
    }
    else if (record.type === "number") {
      if (typeof record.value !== "number") {
        errorMessages.push("숫자를 입력하세요");
      }
      if (record.min !== undefined && record.min > record.value) {
        errorMessages.push(`${record.min}보다 크거나 같아야 합니다.`);
      }
      if (record.max !== undefined && record.max < record.value) {
        errorMessages.push(`${record.max}보다 작거나 같아야 합니다.`);
      }
    }
    else if (record.type === "brn") {
      if (typeof record.value !== "string" || !(/^[0-9]{10}$/).test(record.value)) {
        errorMessages.push("BRN 형식이 잘못되었습니다.");
      }
    }
    else if (["year", "month", "date"].includes(record.type)) {
      if (!(record.value instanceof DateOnly)) {
        errorMessages.push("날짜를 입력하세요");
      }
    }
    else if (["datetime", "datetime-sec"].includes(record.type)) {
      if (!(record.value instanceof DateTime)) {
        errorMessages.push("날짜 및 시간을 입력하세요");
      }
    }
    else if (["time", "time-sec"].includes(record.type)) {
      if (!(record.value instanceof Time)) {
        errorMessages.push("시간을 입력하세요");
      }
    }
    else if (record.type === "text") {
      if (record.minlength !== undefined && record.minlength > (record.value as string).length) {
        errorMessages.push(`문자의 길이가 ${this.minlength}보다 길거나 같아야 합니다.`);
      }
      if (record.maxlength !== undefined && record.maxlength > (record.value as string).length) {
        errorMessages.push(`문자의 길이가 ${record.maxlength}보다 짧거나 같아야 합니다.`);
      }
    }

    if (record.validatorFn) {
      const message = record.validatorFn(this.value);
      if (message !== undefined) {
        errorMessages.push(message);
      }
    }

    const fullErrorMessage = errorMessages.join("\r\n");

    if (this.errorMessage !== fullErrorMessage) {
      this.errorMessage = fullErrorMessage;
    }

    const inputEl = this._elRef.nativeElement.findFirst("input");
    if (inputEl instanceof HTMLInputElement) {
      inputEl.setCustomValidity(fullErrorMessage);
    }
  }

  public onInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;

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
    if (this.value !== newValue) {
      if (this.valueChange.observed) {
        this.valueChange.emit(newValue);
      }
      else {
        this.value = newValue;
      }
    }
  }
}
