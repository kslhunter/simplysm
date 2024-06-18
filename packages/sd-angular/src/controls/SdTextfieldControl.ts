import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Injector,
  Input,
  Output
} from "@angular/core";
import {DateOnly, DateTime, JsonConvert, NumberUtil, StringUtil, Time} from "@simplysm/sd-core-common";
import {coercionBoolean, coercionNumber, getSdFnCheckData, TSdFnInfo} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <div [style]="inputStyle"
         [class]="['_contents', inputClass].filterExists().join(' ')"
         [attr.title]="title ?? placeholder"
         [style.visibility]="!readonly && !disabled ? 'hidden' : undefined">
      @if (controlType === 'password') {
        <span class="tx-trans-light">
        ****
      </span>
      } @else {
        @if (controlValue) {
          <pre>{{ controlValueText }}</pre>
        } @else {
          <div class="tx-trans-lighter">{{ placeholder }}</div>
        }
      }
    </div>
    @if (!readonly && !disabled) {
      <input [type]="controlType"
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
    }

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

        overflow: auto;
        width: 100%;

        height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

        body.sd-theme-compact &,
        body.sd-theme-modern & {
          border: 1px solid var(--trans-lighter);
          border-radius: var(--border-radius-default);
          background: var(--theme-secondary-lightest);

          &:focus {
            outline: none;
            border-color: var(--theme-primary-default);
          }
        }

        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          border-left: none;
          border-right: none;
          border-top: none;
          border-bottom: 2px solid var(--border-color-default);
          background: transparent;
          //transition: border-color 0.3s;
          padding: calc(var(--gap-sm) + 1px) 0 calc(var(--gap-sm) - 1px);

          &:focus {
            outline: none;
            border-bottom-color: var(--theme-primary-default);
          }
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
          body.sd-theme-compact &,
          body.sd-theme-modern & {
            > input,
            > ._contents {
              background: var(--theme-#{$key}-lightest);
            }
          }

          body.sd-theme-mobile &,
          body.sd-theme-kiosk & {
            border-bottom-color: var(--theme-#{$key}-lighter);

            &:focus {
              border-bottom-color: var(--theme-#{$key}-default);
            }
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
        body.sd-theme-compact &,
        body.sd-theme-modern &,
        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
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
              width: 9em;
            }
          }

          &[sd-type=date] {
            > input,
            > ._contents {
              width: 8.25em;
            }
          }

          &[sd-type=datetime] {
            > input,
            > ._contents {
              width: 14em;
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
              height: calc((var(--gap-default) * 2) + (var(--font-size-default) * var(--line-height-strip-unit)));
              min-height: calc((var(--gap-default) * 2) + (var(--font-size-default) * var(--line-height-strip-unit)));
            }
          }
        }

        body.sd-theme-compact &,
        body.sd-theme-modern & {
          > input:focus {
            outline: 1px solid var(--theme-primary-default);
            outline-offset: -1px;
          }
        }

        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          &[sd-size=sm] {
            > input,
            > ._contents {
              padding: calc(var(--gap-xs) + 1px) 0 calc(var(--gap-xs) - 1px);
            }
          }

          &[sd-size=lg] {
            > input,
            > ._contents {
              padding: calc(var(--gap-default) + 1px) 0 calc(var(--gap-default) - 1px);
            }
          }

          > input:focus {
            outline: none;
            border-bottom-color: var(--theme-primary-default);
          }
        }
      }


      body.sd-theme-compact &,
      body.sd-theme-modern & {
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
      }

      body.sd-theme-mobile &,
      body.sd-theme-kiosk & {
        &[sd-disabled=true] {
          > ._contents {
            display: block;
            color: var(--text-trans-light);
            border-color: transparent;
          }

          &[sd-inset=true] {
            > ._contents {
              color: var(--text-trans-default);
              border-color: transparent;
            }
          }
        }
      }

      > ._invalid-indicator {
        display: none;
      }

      body.sd-theme-compact &,
      body.sd-theme-modern & {
        &:has(:invalid),
        &[sd-invalid] {
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

      body.sd-theme-mobile &,
      body.sd-theme-kiosk & {
        &:has(:invalid),
        &[sd-invalid] {
          > input,
          > ._contents {
            border-bottom-color: var(--theme-danger-default);
          }
        }
      }
    }
  `],
  host: {
    "[attr.sd-type]": "type",
    "[attr.sd-disabled]": "disabled",
    "[attr.sd-readonly]": "readonly",
    "[attr.sd-inline]": "inline",
    "[attr.sd-inset]": "inset",
    "[attr.sd-size]": "size",
    "[attr.sd-theme]": "theme",
    "[attr.sd-invalid]": "errorMessage"
  }
})
export class SdTextfieldControl<K extends TSdTextfieldType> implements DoCheck {
  @Input() value?: TSdTextfieldValue<K>;
  @Output() valueChange = new EventEmitter<TSdTextfieldValue<K> | undefined>();

  @Input({required: true}) type!: K;
  @Input() placeholder?: string;
  @Input() title?: string;
  @Input({transform: coercionBoolean}) disabled = false;
  @Input({transform: coercionBoolean}) readonly = false;
  @Input({transform: coercionBoolean}) required = false;
  @Input() min?: TSdTextfieldValue<K>;
  @Input() max?: TSdTextfieldValue<K>;
  @Input({transform: coercionNumber}) minlength?: number;
  @Input({transform: coercionNumber}) maxlength?: number;

  /** 10, 1, 0.1, 0.01, 0.01 방식으로 입력 */
  @Input({transform: coercionNumber}) step?: number;
  @Input() pattern?: string;
  @Input({transform: coercionBoolean}) inline = false;
  @Input({transform: coercionBoolean}) inset = false;
  @Input() size?: "sm" | "lg";
  @Input() validatorFn?: TSdFnInfo<(value: TSdTextfieldValue<K> | undefined) => string | undefined>;
  @Input() theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";
  @Input() inputStyle?: string;
  @Input() inputClass?: string;
  @Input() format?: string;
  @Input({transform: coercionBoolean}) useNumberComma = true;

  errorMessage?: string;

  controlType = "text";
  controlValue = "";
  controlValueText = "";
  controlStep: number | string = "any";
  controlMin?: string;
  controlMax?: string;

  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #cdr = inject(ChangeDetectorRef);

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
        }

        this.errorMessage = StringUtil.isNullOrEmpty(fullErrorMessage) ? undefined : fullErrorMessage;
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

  @HostListener("sd-sheet-cell-copy")
  async onSdSheetCellCopy() {
    if ("clipboard" in navigator) {
      await navigator.clipboard.writeText(JsonConvert.stringify(this.value));
    }
  }

  @HostListener("sd-sheet-cell-paste")
  async onSdSheetCellPaste() {
    if ("clipboard" in navigator) {
      this.#setValue(JsonConvert.parse(await navigator.clipboard.readText()));
      this.#cdr.markForCheck();
    }
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