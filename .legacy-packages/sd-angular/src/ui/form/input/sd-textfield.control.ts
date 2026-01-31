import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import {
  DateOnly,
  DateTime,
  NumberUtils,
  SdError,
  StringUtils,
  Time,
} from "@simplysm/sd-core-common";
import { $computed } from "../../../core/utils/bindings/$computed";
import { setupInvalid } from "../../../core/utils/setups/setupInvalid";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div
      [style]="inputStyle()"
      [class]="['_contents', inputClass()].filterExists().join(' ')"
      [attr.title]="title() ?? placeholder()"
      [style.visibility]="!readonly() && !disabled() ? 'hidden' : undefined"
    >
      @if (controlType() === "password") {
        <span class="tx-trans-light">****</span>
      } @else {
        @if (controlValue()) {
          <pre>{{ controlValueText() ? controlValueText() : " " }}</pre>
        } @else if (placeholder()) {
          <span class="tx-trans-lighter">{{ placeholder() }}</span>
        } @else {
          <span>&nbsp;</span>
        }
      }
    </div>
    @if (!readonly() && !disabled()) {
      <input
        [style]="inputStyle()"
        [class]="inputClass()"
        [attr.title]="title() ?? placeholder()"
        [attr.placeholder]="placeholder()"
        [attr.min]="min()"
        [attr.max]="max()"
        [type]="controlType()"
        [attr.inputmode]="type() === 'number' ? 'numeric' : undefined"
        [value]="controlValue()"
        [attr.autocomplete]="autocomplete()"
        [attr.step]="controlStep()"
        (input)="onInput($event)"
        (paste)="onInputPaste($event)"
      />
    }
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../../scss/commons/variables";
      @use "../../../../scss/commons/mixins";

      sd-textfield {
        display: block;
        position: relative;

        > input,
        > ._contents {
          @include mixins.form-control-base();

          overflow: auto;
          width: 100%;

          border: 1px solid var(--trans-lighter);
          border-radius: var(--border-radius-default);
          background: var(--theme-secondary-lightest);

          &:focus {
            outline: none;
            border-color: var(--theme-secondary-default);
          }

          &[type="date"],
          &[type="month"],
          &[type="datetime-local"] {
            padding-top: calc(var(--gap-sm) - 1px);
            padding-bottom: calc(var(--gap-sm) - 1px);
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

        &[data-sd-type="number"] {
          > input,
          > ._contents {
            text-align: right;
          }
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            > input,
            > ._contents {
              background: var(--theme-#{$key}-lightest);
            }
          }
        }

        &[data-sd-size="sm"] {
          > input,
          > ._contents {
            padding: var(--gap-xs) var(--gap-sm);

            &[type="date"],
            &[type="month"],
            &[type="datetime-local"],
            &[type="color"] {
              padding-top: calc(var(--gap-xs) - 1px);
              padding-bottom: calc(var(--gap-xs) - 1px);
            }
          }
        }

        &[data-sd-size="lg"] {
          > input,
          > ._contents {
            padding: var(--gap-default) var(--gap-lg);

            &[type="date"],
            &[type="month"],
            &[type="datetime-local"],
            &[type="color"] {
              padding-top: calc(var(--gap-default) - 1px);
              padding-bottom: calc(var(--gap-default) - 1px);
            }
          }
        }

        &[data-sd-inline="true"] {
          display: inline-block;
          vertical-align: top;

          > input,
          > ._contents {
            width: auto;
            vertical-align: top;
          }
        }

        &[data-sd-inset="true"] {
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
          }

          > input:focus {
            outline: 1px solid var(--theme-primary-default);
            outline-offset: -1px;
          }

          &[data-sd-type="month"] {
            > input,
            > ._contents {
              width: 8.25em;
            }
          }

          &[data-sd-type="date"] {
            > input,
            > ._contents {
              width: 8.25em;
            }
          }

          &[data-sd-type="datetime-local"] {
            > input,
            > ._contents {
              width: 14em;
            }
          }

          &[data-sd-type="year"] {
            > input,
            > ._contents {
              width: 4em;
            }
          }

          &[data-sd-type="color"] {
            > input,
            > ._contents {
              height: calc(
                var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2
              );
            }

            &[data-sd-size="sm"] {
              > input,
              > ._contents {
                height: calc(
                  var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2
                );
              }
            }

            &[data-sd-size="lg"] {
              > input,
              > ._contents {
                height: calc(
                  var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2
                );
              }
            }
          }
        }

        //body.sd-theme-compact & {
        &[data-sd-disabled="true"] {
          > ._contents {
            display: block;
            background: var(--theme-gray-lightest);
            color: var(--text-trans-light);
          }

          &[data-sd-inset="true"] {
            > ._contents {
              background: var(--control-color);
              color: var(--text-trans-default);
            }
          }
        }

        &[data-sd-readonly="true"] {
          > ._contents {
            display: block;
            //background: var(--background-color);
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-type]": "type()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-readonly]": "readonly()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-theme]": "theme()",
  },
})
export class SdTextfieldControl<K extends keyof TSdTextfieldTypes> {
  value = model<TSdTextfieldTypes[K]>();

  type = input.required<K>();
  placeholder = input<string>();
  title = input<string>();
  inputStyle = input<string>();
  inputClass = input<string>();

  disabled = input(false, { transform: transformBoolean });
  readonly = input(false, { transform: transformBoolean });

  required = input(false, { transform: transformBoolean });
  min = input<TSdTextfieldTypes[K]>();
  max = input<TSdTextfieldTypes[K]>();
  minlength = input<number>();
  maxlength = input<number>();
  pattern = input<string>();
  validatorFn = input<(value: TSdTextfieldTypes[K] | undefined) => string | undefined>();
  format = input<string>();

  /** 10, 1, 0.1, 0.01, 0.01 방식으로 입력 */
  step = input<number>();
  autocomplete = input<string>();
  useNumberComma = input(true, { transform: transformBoolean });
  minDigits = input<number>();

  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();

  controlType = $computed(() => {
    return this.type() === "number"
      ? "text"
      : this.type() === "format"
        ? "text"
        : this.type() === "datetime"
          ? "datetime-local"
          : this.type() === "datetime-sec"
            ? "datetime-local"
            : this.type() === "time-sec"
              ? "time"
              : this.type();
    // TODO: datepicker 따로 만들어서 텍스트 입력으로 일자 적을 수 있게 하는게 좋을 듯
  });

  controlValue = $computed(() => {
    return this._convertToControlValue(this.value());
  });

  controlValueText = $computed(() => {
    const type = this.type();
    const value = this.value();

    if (type === "datetime" && value instanceof DateTime) {
      return value.toFormatString("yyyy-MM-dd tt hh:mm");
    } else if (type === "datetime-sec" && value instanceof DateTime) {
      return value.toFormatString("yyyy-MM-dd tt hh:mm:ss");
    } else if (type === "time" && (value instanceof DateTime || value instanceof Time)) {
      return value.toFormatString("tt hh:mm");
    } else if (type === "time-sec" && (value instanceof DateTime || value instanceof Time)) {
      return value.toFormatString("tt hh:mm:ss");
    } else if (type === "number" && typeof value === "number" && this.minDigits() != null) {
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 10,
        minimumFractionDigits: this.minDigits()!,
      });
    } else {
      return this.controlValue();
    }
  });

  controlStep = $computed(() => {
    if (this.step() !== undefined) {
      return this.step();
    } else if (this.type() === "datetime-sec" || this.type() === "time-sec") {
      return 1;
    } else {
      return "any";
    }
  });

  constructor() {
    setupInvalid(() => {
      const value = this.value();

      const errorMessages: string[] = [];
      if (value == null) {
        if (this.required()) {
          errorMessages.push("값을 입력하세요.");
        }
      } else if (this.type() === "number") {
        if (typeof value !== "number") {
          errorMessages.push("숫자를 입력하세요");
        } else {
          const min = this.min();
          const max = this.max();
          if (typeof min === "number" && min > value) {
            errorMessages.push(`${min}보다 크거나 같아야 합니다.`);
          }
          if (typeof max === "number" && max < value) {
            errorMessages.push(`${max}보다 작거나 같아야 합니다.`);
          }
        }
      } else if (this.type() === "format" && !StringUtils.isNullOrEmpty(this.format())) {
        const formatItems = this.format()!.split("|");

        if (
          !formatItems.some(
            (formatItem) => formatItem.match(/X/g)?.length === (value as string).length,
          )
        ) {
          errorMessages.push(`문자의 길이가 요구되는 길이와 다릅니다.`);
        }
      } else if (["year", "month", "date"].includes(this.type())) {
        if (!(value instanceof DateOnly)) {
          errorMessages.push("날짜를 입력하세요");
        } else {
          const min = this.min();
          const max = this.max();
          if (min instanceof DateOnly && min.tick > value.tick) {
            errorMessages.push(`${min}보다 크거나 같아야 합니다.`);
          }
          if (max instanceof DateOnly && max.tick < value.tick) {
            errorMessages.push(`${max}보다 작거나 같아야 합니다.`);
          }
        }
      } else if (["datetime", "datetime-sec"].includes(this.type())) {
        if (!(value instanceof DateTime)) {
          errorMessages.push("날짜 및 시간을 입력하세요");
        }
      } else if (["time", "time-sec"].includes(this.type())) {
        if (!(value instanceof Time)) {
          errorMessages.push("시간을 입력하세요");
        }
      } else if (this.type() === "text") {
        const minlength = this.minlength();
        const maxlength = this.maxlength();
        if (minlength !== undefined && minlength > (value as string).length) {
          errorMessages.push(`문자의 길이가 ${minlength}보다 길거나 같아야 합니다.`);
        }
        if (maxlength !== undefined && maxlength > (value as string).length) {
          errorMessages.push(`문자의 길이가 ${maxlength}보다 짧거나 같아야 합니다.`);
        }

        // pattern 속성 검사 수동 적용
        const pattern = this.pattern();
        if (!StringUtils.isNullOrEmpty(pattern)) {
          try {
            const regex = new RegExp(pattern);
            if (!regex.test(value as string)) {
              errorMessages.push(`입력 값이 형식에 맞지 않습니다.`);
            }
          } catch (err) {
            throw new SdError(
              err instanceof Error ? err : String(err),
              `잘못된 pattern: ${pattern}`,
            );
          }
        }
      }

      if (this.validatorFn()) {
        const message = this.validatorFn()!(value);
        if (message !== undefined) {
          errorMessages.push(message);
        }
      }

      return errorMessages.join("\r\n");
    });
  }

  onInput(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    this._setControlValue(inputEl.value);
  }

  onInputPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData("text/plain").trim();
    this._setControlValue(text ?? "");
  }

  private _setControlValue(value: string): void {
    if (value === "") {
      this._setValue(undefined);
    } else if (this.type() === "number") {
      const inputValue = value.replace(/[^0-9-.]/g, "");
      if (
        Number.isNaN(Number(inputValue)) ||
        inputValue.endsWith(".") ||
        (inputValue.includes(".") && Number(inputValue) === 0)
      ) {
      } else {
        this._setValue(NumberUtils.parseFloat(inputValue));
      }
    } else if (this.type() === "format") {
      const nonFormatChars = this.format()?.match(/[^X]/g)?.distinct();
      if (nonFormatChars) {
        this._setValue(
          value.replace(
            new RegExp(`[${nonFormatChars.map((item) => "\\" + item).join("")}]`, "g"),
            "",
          ),
        );
      } else {
        this._setValue(value);
      }
    } else if (["year", "month", "date"].includes(this.type())) {
      try {
        this._setValue(DateOnly.parse(value));
      } catch {}
    } else if (["datetime", "datetime-sec"].includes(this.type())) {
      try {
        this._setValue(DateTime.parse(value));
      } catch {}
    } else if (["time", "time-sec"].includes(this.type())) {
      try {
        this._setValue(Time.parse(value));
      } catch {}
    } else {
      this._setValue(value);
    }
  }

  private _setValue(newValue: any): void {
    this.value.set(newValue);
  }

  private _convertToControlValue(value: TSdTextfieldTypes[K] | undefined): string {
    if (value == null) {
      return "";
    }

    if (this.type() === "number" && typeof value === "number") {
      return this.useNumberComma()
        ? value.toLocaleString(undefined, {
            maximumFractionDigits: 10,
          })
        : value.toString(10);
    }

    if (
      this.type() === "format" &&
      !StringUtils.isNullOrEmpty(this.format()) &&
      typeof value === "string"
    ) {
      const formatItems = this.format()!.split("|");

      for (const formatItem of formatItems) {
        const fullLength = formatItem.match(/X/g)?.length;
        if (fullLength === value.length) {
          let result = "";
          let valCur = 0;
          for (const formatItemChar of formatItem) {
            if (formatItemChar === "X") {
              result += value[valCur];
              valCur++;
            } else {
              result += formatItemChar;
            }
          }
          return result;
        }
      }

      return value;
    }

    if (this.type() === "datetime" && value instanceof DateTime) {
      return value.toFormatString("yyyy-MM-ddTHH:mm");
    }

    if (this.type() === "datetime-sec" && value instanceof DateTime) {
      return value.toFormatString("yyyy-MM-ddTHH:mm:ss");
    }

    if (this.type() === "year" && value instanceof DateOnly) {
      return value.toFormatString("yyyy");
    }

    if (this.type() === "month" && value instanceof DateOnly) {
      return value.toFormatString("yyyy-MM");
    }

    if (this.type() === "date" && value instanceof DateOnly) {
      return value.toFormatString("yyyy-MM-dd");
    }

    if (this.type() === "time" && (value instanceof DateTime || value instanceof Time)) {
      return value.toFormatString("HH:mm");
    }

    if (this.type() === "time-sec" && (value instanceof DateTime || value instanceof Time)) {
      return value.toFormatString("HH:mm:ss");
    }

    if (typeof value === "string") {
      return value;
    }

    throw new Error(
      `'sd-textfield'에 대한 'value'가 잘못되었습니다. (입력값: ${value.toString()})`,
    );
  }

  /*@HostListener("sd-sheet-cell-copy")
  async onSdSheetCellCopy() {
    if ("clipboard" in navigator) {
      await navigator.clipboard.writeText(JsonConvert.stringify(this.value()));
    }
  }

  @HostListener("sd-sheet-cell-paste")
  async onSdSheetCellPaste() {
    if ("clipboard" in navigator) {
      this._setValue(JsonConvert.parse(await navigator.clipboard.readText()));
    }
  }*/
}

/*export type TSdTextfieldType =
  | "number"
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

export type TSdTextfieldTypes[K] = K extends "number"
  ? number
  : K extends "text" | "password" | "color" | "email" | "format"
    ? string
    : K extends "date" | "month" | "year"
      ? DateOnly
      : K extends "datetime" | "datetime-sec"
        ? DateTime
        : K extends "time" | "time-sec"
          ? Time
          : never;*/

export type TSdTextfieldTypes = {
  "number": number;

  "text": string;
  "password": string;
  "color": string;
  "email": string;
  "format": string;

  "date": DateOnly;
  "month": DateOnly;
  "year": DateOnly;

  "datetime": DateTime;
  "datetime-sec": DateTime;

  "time": Time;
  "time-sec": Time;
};

export const sdTextfieldTypes: (keyof TSdTextfieldTypes)[] = [
  "number",
  "text",
  "password",
  "color",
  "email",
  "format",
  "date",
  "month",
  "year",
  "datetime",
  "datetime-sec",
  "time",
  "time-sec",
];
