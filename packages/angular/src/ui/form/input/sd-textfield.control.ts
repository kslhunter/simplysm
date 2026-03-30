import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { setupInvalid } from "../../../core/utils/setups/setupInvalid";
import {
  textfieldTypeHandlers,
  type TSdTextfieldTypes,
} from "./sd-textfield-type-handlers";

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div
      [style]="inputStyle()"
      [class]="inputClass() ? '_contents ' + inputClass() : '_contents'"
      [attr.title]="title() ?? placeholder()"
      [style.visibility]="!readonly() && !disabled() ? 'hidden' : undefined"
    >
      @if (controlType() === "password") {
        <span class="tx-trans-light">****</span>
      } @else {
        @if (controlValue()) {
          <pre>{{ controlValueText() ?? controlValue() }} </pre>
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
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-type]": "controlType()",
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

  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });

  required = input(false, { transform: booleanAttribute });
  min = input<TSdTextfieldTypes[K]>();
  max = input<TSdTextfieldTypes[K]>();
  minlength = input<number>();
  maxlength = input<number>();
  pattern = input<string>();
  validatorFn = input<(value: TSdTextfieldTypes[K] | undefined) => string | undefined>();
  format = input<string>();

  step = input<number>();
  autocomplete = input<string>();
  useNumberComma = input(true, { transform: booleanAttribute });
  minDigits = input<number>();

  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();

  private readonly handler = computed(() => textfieldTypeHandlers[this.type()]);

  controlType = computed(() => this.handler().controlType);

  controlStep = computed(() => this.handler().getControlStep(this.step()));

  controlValue = computed(() => {
    const value = this.value();
    if (value == null) return "";
    return this.handler().toControlValue(value, {
      useNumberComma: this.useNumberComma(),
      format: this.format(),
    });
  });

  controlValueText = computed(() => {
    const value = this.value();
    if (value == null) return undefined;
    return this.handler().toDisplayText(value, {
      minDigits: this.minDigits(),
    });
  });

  constructor() {
    setupInvalid(() => {
      const value = this.value();
      const handlerErrors = this.handler().validate(value, {
        required: this.required(),
        min: this.min(),
        max: this.max(),
        minlength: this.minlength(),
        maxlength: this.maxlength(),
        pattern: this.pattern(),
        format: this.format(),
      });

      const errorMessages = [...handlerErrors];

      if (this.validatorFn()) {
        const message = this.validatorFn()!(value);
        if (message !== undefined) {
          errorMessages.push(message);
        }
      }

      return errorMessages.join("\r\n");
    });
  }

  onInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.value === "") {
      this.value.set(undefined);
      return;
    }
    const parsed = this.handler().parse(inputEl.value, { format: this.format() });
    if (parsed === undefined) {
      return;
    }
    this.value.set(parsed as TSdTextfieldTypes[K]);
  }

  onInputPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain").trim();
    if (text == null || text === "") {
      this.value.set(undefined);
      return;
    }
    const parsed = this.handler().parse(text, { format: this.format() });
    if (parsed === undefined) {
      const inputEl = event.target as HTMLInputElement;
      inputEl.value = this.controlValue();
      return;
    }
    this.value.set(parsed as TSdTextfieldTypes[K] | undefined);
  }
}
