import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  NgZone,
  Output,
  ViewChild
} from "@angular/core";
import { DateOnly, DateTime, StringUtil, Time } from "@simplysm/sd-core-common";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { sdThemes, TSdTheme } from "../commons";

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="!multiline">
      <input #input
             *ngIf="(!disabled && !readonly)"
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
             [attr.class]="inputClass"
             [attr.style]="inputFullStyle"
             [attr.title]="title || placeholder"
             (input)="onInput()"
             [attr.inputmode]="type === 'number' ? 'numeric' : undefined"/>
      <div *ngIf="disabled || readonly"
           [attr.class]="(disabled ? '_disabled ' : readonly ? '_readonly ' : '') + (inputClass || '')"
           [attr.style]="inputFullStyle">
        <ng-content></ng-content>
        <div *ngIf="controlType === 'password' && readonly && !disabled" class="sd-text-brightness-light">
          ****
        </div>
        <ng-container *ngIf="controlType !== 'password'">
          <ng-container *ngIf="controlValue">
            <pre>{{ controlValue }}</pre>
          </ng-container>
          <ng-container *ngIf="!controlValue">
            <span class="sd-text-brightness-lighter">{{ placeholder }}</span>
          </ng-container>
        </ng-container>
      </div>
    </ng-container>

    <ng-container *ngIf="multiline">
      <textarea #input
                *ngIf="(!disabled && !readonly)"
                [value]="controlValue"
                [attr.placeholder]="placeholder"
                [attr.title]="title || placeholder"
                [required]="required"
                [attr.rows]="controlRows"
                [attr.class]="inputClass"
                [attr.style]="'white-space: nowrap; ' + inputFullStyle"
                (input)="onInput()"></textarea>
      <div *ngIf="disabled || readonly"
           [attr.class]="(disabled ? '_disabled ' : readonly ? '_readonly ' : '') + (inputClass || '')"
           [attr.style]="inputFullStyle">
        <ng-content></ng-content>
        <pre>{{ controlValue }}</pre>
      </div>
    </ng-container>

    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    @import "../../scss/variables-scss-arr";

    :host {
      display: block;
      position: relative;

      > input,
      > textarea,
      > div._readonly,
      > div._disabled {
        @include form-control-base();

        //border: 1px solid var(--border-color);
        border: 1px solid var(--trans-brightness-light);
        border-radius: var(--border-radius-default);

        &::-webkit-input-placeholder {
          color: var(--text-brightness-lighter);
        }
      }

      > input,
      > textarea,
      > div._readonly {
        background: var(--theme-color-secondary-lightest);
      }

      > div._disabled {
        background: var(--theme-color-grey-lightest);
        color: var(--text-brightness-light);
      }

      > input {
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
      }

      > div._readonly,
      > div._disabled {
        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
      }

      > input,
      > textarea,
      > div._readonly,
      > div._disabled {
        &:focus {
          outline: none;
          border-color: var(--theme-color-primary-default);
        }
      }

      &[sd-type=number] {
        > input,
        > div._readonly,
        > div._disabled {
          text-align: right;
        }
      }

      &[sd-inline=true] {
        display: inline-block;
        vertical-align: top;

        > input,
        > textarea,
        > div._readonly,
        > div._disabled {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }
      }

      &[sd-size=sm] {
        > input,
        > textarea,
        > div._readonly,
        > div._disabled {
          padding: var(--gap-xs) var(--gap-sm);

          &[type=color] {
            padding-top: 1px;
            padding-bottom: 1px;
          }
        }

        > input {
          height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }

        > div._readonly,
        > div._disabled {
          min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }
      }

      &[sd-size=lg] {
        > input,
        > textarea,
        > div._readonly,
        > div._disabled {
          padding: var(--gap-default) var(--gap-lg);

          &[type=color] {
            padding-top: 1px;
            padding-bottom: 1px;
          }
        }

        > input {
          height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }

        > div._readonly,
        > div._disabled {
          min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        }
      }

      &[sd-inset=true] {
        > input,
        > textarea,
        > div._readonly,
        > div._disabled {
          border: none;
          border-radius: 0;
        }

        > div._disabled {
          background: white !important;
          color: var(--text-brightness-default);
        }

        > input {
          height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        > div._readonly,
        > div._disabled {
          min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-size=sm] {
          > input {
            height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }

          > div._readonly,
          > div._disabled {
            min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }
        }

        &[sd-size=lg] {
          > input {
            height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }

          > div._readonly,
          > div._disabled {
            min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }
        }

        > input:focus,
        > textarea:focus {
          outline: 1px solid var(--theme-color-primary-default);
          outline-offset: -1px;
        }
      }

      @each $theme in $arr-theme-color {
        &[sd-theme=#{$theme}] {
          > input,
          > textarea,
          > div._readonly {
            background: var(--theme-color-#{$theme}-lightest);
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
export class SdTextfieldControl implements DoCheck {
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
  @SdInputValidate(Boolean)
  public multiline?: boolean;

  @Input()
  @SdInputValidate(Number)
  public rows?: number;

  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  public autoRows = false;

  @Input()
  @SdInputValidate({
    type: [String, Boolean],
    includes: ["vertical", "horizontal", true, false]
  })
  public resize?: "vertical" | "horizontal" | boolean;

  @Input()
  @SdInputValidate(Function)
  public validatorFn?: (value: number | string | DateOnly | DateTime | Time | undefined) => string | undefined;

  @Input("input.style")
  @SdInputValidate(String)
  public inputStyle?: string;

  @Input("input.class")
  @SdInputValidate(String)
  public inputClass?: string;

  @Input()
  @SdInputValidate({
    type: String,
    includes: sdThemes
  })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme;

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

  public get inputFullStyle(): string | undefined {
    let styleStr = "";
    if (this.multiline) {
      const controlResize = this.resize === "vertical" ? "vertical"
        : this.resize === "horizontal" ? "horizontal"
          : this.resize ? undefined : "none";

      if (controlResize !== undefined) {
        styleStr += `resize: ${controlResize};`;
      }
    }

    return styleStr + (this.inputStyle ?? "");
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

  public get controlRows(): number | undefined {
    if (this.multiline && this.autoRows) {
      if (typeof this.value === "string") {
        return this.value.split(/[\r\n]/).length;
      }

      return 1;
    }

    return this.rows;
  }

  public constructor(private readonly _zone: NgZone) {
  }

  public ngDoCheck(): void {
    this._zone.runOutsideAngular(() => {
      setTimeout(() => {
        const inputEl = this.inputElRef?.nativeElement;
        if (inputEl && this.autoRows && this.multiline && typeof this.value === "string") {
          inputEl.style.height = "";
          inputEl.style.height = (inputEl.scrollHeight + (inputEl.offsetHeight - inputEl.clientHeight)) + "px";
        }
      });
    });
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
        // this._setValue(inputEl.value);
      }
    }
    else if (["datetime", "datetime-sec"].includes(this.type)) {
      try {
        this._setValue(DateTime.parse(inputEl.value));
      }
      catch (err) {
        // this._setValue(inputEl.value);
      }
    }
    else if (["time", "time-sec"].includes(this.type)) {
      try {
        this._setValue(Time.parse(inputEl.value));
      }
      catch (err) {
        // this._setValue(inputEl.value);
      }
    }
    else {
      this._setValue(inputEl.value);
    }
  }

  private _setValue(newValue: any): void {
    if (this.valueChange.observed) {
      this.valueChange.emit(newValue);
    }
    else {
      this.value = newValue;
    }
  }
}
