import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  inject,
  Injector,
  Input,
  Output
} from "@angular/core";
import {DateOnly, DateTime, NumberUtil, StringUtil, Time} from "@simplysm/sd-core-common";
import {coercionBoolean, coercionNumber, getSdFnCheckData, TSdFnInfo} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {NgIf} from "@angular/common";

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgIf
  ],
  template: `
    <div [style]="inputStyle"
         [class]="['_contents', inputClass].filterExists().join(' ')"
         [attr.title]="title ?? placeholder">
      <div *ngIf="controlType === 'password'" class="tx-trans-light">
        ****
      </div>
      <ng-container *ngIf="controlType !== 'password'">
        <ng-container *ngIf="controlValue">
          <pre>{{ controlValueText }}</pre>
        </ng-container>
        <ng-container *ngIf="!controlValue">
          <span class="tx-trans-lighter">{{ placeholder }}</span>
        </ng-container>
      </ng-container>
    </div>
    <input *ngIf="!readonly && !disabled"
           [type]="controlType"
           [value]="controlValue"
           [attr.placeholder]="placeholder"
           [required]="required"
           [attr.min]="controlMin"
           [attr.max]="controlMax"
           [attr.minlength]="minlength"
           [attr.maxlength]="maxlength"
           [attr.step]="controlStep"
           [attr.pattern]="pattern"
           [attr.title]="title ?? placeholder"
           (input)="onInput($event)"
           [attr.inputmode]="type === 'number' ? 'numeric' : undefined"
           [style]="inputStyle"
           [class]="inputClass"/>

    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";
    @import "../scss/mixins";

    :host {
      display: block;
      position: relative;

      > input,
      > ._contents {
        @include form-control-base();

        height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        overflow: auto;
        width: 100%;

        @media not all and (pointer: coarse) {
          border: 1px solid var(--trans-lighter);
          border-radius: var(--border-radius-default);
          background: var(--theme-secondary-lightest);
        }

        @media all and (pointer: coarse) {
          border: none;
          border-bottom: 2px solid var(--border-color-default);
          background: transparent;
          transition: border-color 0.3s;
          padding: calc(var(--gap-sm) + 1px) 0 calc(var(--gap-sm) - 1px);
        }

        &::-webkit-scrollbar {
          display: none;
        }

        &::-webkit-input-placeholder {
          color: var(--text-trans-lighter);
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
          border-color: var(--theme-primary-default);
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

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          > input,
          > ._contents {
            background: var(--theme-#{$key}-lightest);
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

        &[sd-type=month] {
          > input,
          > ._contents {
            width: 100px;
          }
        }

        &[sd-type=date] {
          > input,
          > ._contents {
            width: 95px;
          }
        }

        &[sd-type=datetime] {
          > input,
          > ._contents {
            width: 170px;
          }
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
          outline: 1px solid var(--theme-primary-default);
          outline-offset: -1px;
        }
      }


      &[sd-disabled=true] {
        > ._contents {
          display: block;
          background: var(--theme-grey-lightest);
          color: var(--text-trans-light);
        }

        &[sd-inset=true] {
          > ._contents {
            background: white;
            color: var(--text-trans-default);
          }
        }
      }

      > ._invalid-indicator {
        display: none;
      }

      @media not all and (pointer: coarse) {
        &:has(:invalid), &[sd-invalid] {
          > ._invalid-indicator {
            display: block;
            position: absolute;
            background: var(--theme-danger-default);

            top: var(--gap-xs);
            left: var(--gap-xs);
            border-radius: 100%;
            width: var(--gap-sm);
            height: var(--gap-sm);
          }
        }
      }

      @media all and (pointer: coarse) {
        &:has(:invalid), &[sd-invalid] {
          > input,
          > ._contents {
            border-bottom-color: var(--theme-danger-default);
          }
        }
      }
    }
  `]
})
export class SdTextfieldControl<K extends TSdTextfieldType> implements DoCheck {
  @Input({required: true})
  @HostBinding("attr.sd-type")
  type!: K;

  @Input()
  placeholder?: string;

  @Input()
  title?: string;

  @Input()
  value?: TSdTextfieldValue<K>;

  @Output()
  valueChange = new EventEmitter<TSdTextfieldValue<K> | undefined>();

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-readonly")
  readonly = false;

  @Input({transform: coercionBoolean})
  required = false;

  @Input()
  min?: TSdTextfieldValue<K>;

  @Input()
  max?: TSdTextfieldValue<K>;

  @Input({transform: coercionNumber})
  minlength?: number;

  @Input({transform: coercionNumber})
  maxlength?: number;

  /**
   * 10, 1, 0.1, 0.01, 0.01 방식으로 입력
   */
  @Input({transform: coercionNumber})
  step?: number;

  @Input()
  pattern?: string;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inline")
  inline = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;

  @Input()
  @HostBinding("attr.sd-size")
  size?: "sm" | "lg";

  @Input()
  validatorFn?: TSdFnInfo<(value: TSdTextfieldValue<K> | undefined) => string | undefined>;

  @Input()
  @HostBinding("attr.sd-theme")
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";

  @Input()
  inputStyle?: string;

  @Input()
  inputClass?: string;

  @Input()
  format?: string;

  @Input({transform: coercionBoolean})
  useNumberComma = true;

  @HostBinding("attr.sd-invalid")
  errorMessage?: string;

  controlType = "text";
  controlValue = "";
  controlValueText = "";
  controlStep: number | string = "any";
  controlMin?: string;
  controlMax?: string;

  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck(): void {
    this.#sdNgHelper.doCheck(run => {
      run({
        type: [this.type]
      }, () => {
        this.controlType = this.type === "number" ? "text"
          : this.type === "format" ? "text"
            : this.type === "datetime" ? "datetime-local"
              : this.type === "datetime-sec" ? "datetime-local"
                : this.type === "time-sec" ? "time"
                  : this.type;
      });

      run({
        type: [this.type],
        value: [this.value],
        useNumberComma: [this.useNumberComma],
        format: [this.format]
      }, () => {
        this.controlValue = this.#convertToControlValue(this.value);
      });

      run({
        type: [this.type],
        controlValue: [this.controlValue],
        value: [this.value]
      }, () => {
        if (this.type === "datetime" && this.value instanceof DateTime) {
          this.controlValueText = this.value.toFormatString("yyyy-MM-dd tt hh:mm");
        }
        else if (this.type === "datetime-sec" && this.value instanceof DateTime) {
          this.controlValueText = this.value.toFormatString("yyyy-MM-dd tt hh:mm:ss");
        }
        else if (this.type === "time" && (this.value instanceof DateTime || this.value instanceof Time)) {
          this.controlValueText = this.value.toFormatString("tt hh:mm");
        }
        else if (this.type === "time-sec" && (this.value instanceof DateTime || this.value instanceof Time)) {
          this.controlValueText = this.value.toFormatString("tt hh:mm:ss");
        }
        else {
          this.controlValueText = this.controlValue;
        }
      });

      run({
        type: [this.type],
        step: [this.step]
      }, () => {
        if (this.step !== undefined) {
          this.controlStep = this.step;
        }
        else if (this.type === "datetime-sec" || this.type === "time-sec") {
          this.controlStep = 1;
        }
        else {
          this.controlStep = "any";
        }
      });

      run({
        type: [this.type],
        min: [this.min],
        useNumberComma: [this.useNumberComma],
        format: [this.format]
      }, () => {
        if (this.min instanceof DateOnly) {
          this.controlMin = this.min.toFormatString("yyyy-MM-dd");
        }
        else {
          this.controlMin = this.#convertToControlValue(this.min);
        }
      });

      run({
        type: [this.type],
        max: [this.max],
        useNumberComma: [this.useNumberComma],
        format: [this.format]
      }, () => {
        if (this.max instanceof DateOnly) {
          this.controlMax = this.max.toFormatString("yyyy-MM-dd");
        }
        else {
          this.controlMax = this.#convertToControlValue(this.max);
        }
      });

      run({
        type: [this.type],
        value: [this.value],
        required: [this.required],
        min: [this.min],
        max: [this.max],
        minlength: [this.minlength],
        maxlength: [this.maxlength],
        ...getSdFnCheckData("validatorFn", this.validatorFn)
      }, () => {
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
          else {
            if (typeof this.min === "number" && this.min > this.value) {
              errorMessages.push(`${this.min}보다 크거나 같아야 합니다.`);
            }
            if (typeof this.max === "number" && this.max < this.value) {
              errorMessages.push(`${this.max}보다 작거나 같아야 합니다.`);
            }
          }
        }
        else if (this.type === "format" && !StringUtil.isNullOrEmpty(this.format)) {
          const formatItems = this.format.split("|");

          if (!formatItems.some((formatItem) => formatItem.match(/X/g)?.length === (this.value as string).length)) {
            errorMessages.push(`문자의 길이가 요구되는 길이와 다릅니다.`);
          }
        }
        else if (["year", "month", "date"].includes(this.type)) {
          if (!(this.value instanceof DateOnly)) {
            errorMessages.push("날짜를 입력하세요");
          }
          else {
            if (this.min instanceof DateOnly && this.min.tick > this.value.tick) {
              errorMessages.push(`${this.min}보다 크거나 같아야 합니다.`);
            }
            if (this.max instanceof DateOnly && this.max.tick < this.value.tick) {
              errorMessages.push(`${this.max}보다 작거나 같아야 합니다.`);
            }
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
          const message = this.validatorFn[0](this.value);
          if (message !== undefined) {
            errorMessages.push(message);
          }
        }

        const fullErrorMessage = errorMessages.join("\r\n");

        const inputEl = this.#elRef.nativeElement.findFirst("input");
        if (inputEl instanceof HTMLInputElement) {
          inputEl.setCustomValidity(fullErrorMessage);
          this.errorMessage = StringUtil.isNullOrEmpty(fullErrorMessage) ? undefined : fullErrorMessage;
        }
      });
    });
  }

  onInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;

    if (inputEl.value === "") {
      this.#setValue(undefined);
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
        this.#setValue(NumberUtil.parseFloat(inputValue));
      }
    }
    else if (this.type === "format") {
      const nonFormatChars = this.format?.match(/[^X]/g)?.distinct();
      if (nonFormatChars) {
        this.#setValue(inputEl.value.replace(new RegExp(`[${nonFormatChars.map((item) => "\\" + item).join("")}]`, "g"), ""));
      }
      else {
        this.#setValue(inputEl.value);
      }
    }
    else if (["year", "month", "date"].includes(this.type)) {
      try {
        this.#setValue(DateOnly.parse(inputEl.value));
      }
      catch (err) {
      }
    }
    else if (["datetime", "datetime-sec"].includes(this.type)) {
      try {
        this.#setValue(DateTime.parse(inputEl.value));
      }
      catch (err) {
      }
    }
    else if (["time", "time-sec"].includes(this.type)) {
      try {
        this.#setValue(Time.parse(inputEl.value));
      }
      catch (err) {
      }
    }
    else {
      this.#setValue(inputEl.value);
    }
  }

  #setValue(newValue: any): void {
    if (this.value !== newValue) {
      if (this.valueChange.observed) {
        this.valueChange.emit(newValue);
      }
      else {
        this.value = newValue;
      }
    }
  }

  #convertToControlValue(value: TSdTextfieldValue<K> | undefined): string {
    if (value == null) {
      return "";
    }

    if (this.type === "number" && typeof value === "number") {
      return this.useNumberComma ? value.toLocaleString(undefined, {maximumFractionDigits: 10}) : value.toString(10);
    }

    if (this.type === "format" && !StringUtil.isNullOrEmpty(this.format) && typeof value === "string") {
      const formatItems = this.format.split("|");

      for (const formatItem of formatItems) {
        const fullLength = formatItem.match(/X/g)?.length;
        if (fullLength === value.length) {
          let result = "";
          let valCur = 0;
          for (const formatItemChar of formatItem) {
            if (formatItemChar === "X") {
              result += value[valCur];
              valCur++;
            }
            else {
              result += formatItemChar;
            }
          }
          return result;
        }
      }

      return value;
    }

    if (this.type === "datetime" && value instanceof DateTime) {
      return value.toFormatString("yyyy-MM-ddTHH:mm");
    }

    if (this.type === "datetime-sec" && value instanceof DateTime) {
      return value.toFormatString("yyyy-MM-ddTHH:mm:ss");
    }

    if (this.type === "year" && value instanceof DateOnly) {
      return value.toFormatString("yyyy");
    }

    if (this.type === "month" && value instanceof DateOnly) {
      return value.toFormatString("yyyy-MM");
    }

    if (this.type === "date" && value instanceof DateOnly) {
      return value.toFormatString("yyyy-MM-dd");
    }

    if (this.type === "time" && (value instanceof DateTime || value instanceof Time)) {
      return value.toFormatString("HH:mm");
    }

    if (this.type === "time-sec" && (value instanceof DateTime || value instanceof Time)) {
      return value.toFormatString("HH:mm:ss");
    }

    if (typeof value === "string") {
      return value;
    }


    throw new Error(`'sd-textfield'에 대한 'value'가 잘못되었습니다. (입력값: ${value.toString()})`);
  }
}

export type TSdTextfieldType =
  "number"
  | "text"
  | "password"
  | "date"
  | "datetime"
  | "datetime-sec"
  | "time"
  | "time-sec"
  | "month"
  | "year"
  | "color"
  | "email"
  | "format";

export type TSdTextfieldValue<K> = K extends "number" ? number
  : K extends "text" | "password" | "color" | "email" | "format" ? string
    : K extends "date" | "month" | "year" ? DateOnly
      : K extends "datetime" | "datetime-sec" ? DateTime
        : K extends "time" | "time-sec" ? Time
          : never;