import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { setupInvalid } from "../../../core/utils/setups/setupInvalid";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { $computed } from "../../../core/utils/bindings/$computed";

@Component({
  selector: "sd-textarea",
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
      @if (value()) {
        <pre>{{ value() }} </pre>
      } @else if (placeholder()) {
        <span class="tx-trans-lighter">{{ placeholder() }}</span>
      } @else {
        <span>&nbsp;</span>
      }
    </div>
    @if (!readonly() && !disabled()) {
      <textarea
        [value]="value() ?? ''"
        [attr.placeholder]="placeholder()"
        [attr.title]="title() ?? placeholder()"
        [attr.rows]="currRows()"
        (input)="onInput($event)"
        [style]="inputStyle()"
        [class]="inputClass()"
      ></textarea>
    }
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../../scss/commons/variables";
      @use "../../../../scss/commons/mixins";

      sd-textarea {
        display: block;
        position: relative;

        > textarea,
        > ._contents {
          @include mixins.form-control-base();
          resize: none;

          overflow: auto;
          width: 100%;

          border: 1px solid var(--trans-lighter);
          border-radius: var(--border-radius-default);
          background: var(--theme-secondary-lightest);

          &:focus {
            outline: none;
            border-color: var(--theme-primary-default);
          }

          &::-webkit-scrollbar {
            display: none;
          }

          &::-webkit-input-placeholder {
            color: var(--text-trans-lighter);
          }
        }

        &:not([data-sd-inset="true"]):not([data-sd-disabled="true"]) > ._contents {
          height: 0;
          max-height: 0;
          padding-top: 0;
          padding-bottom: 0;
          margin-top: 0;
          margin-bottom: 0;
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            > textarea,
            > ._contents {
              background: var(--theme-#{$key}-lightest);
            }
          }
        }

        &[data-sd-size="sm"] {
          > textarea,
          > ._contents {
            padding: var(--gap-xs) var(--gap-sm);
          }
        }

        &[data-sd-size="lg"] {
          > textarea,
          > ._contents {
            padding: var(--gap-default) var(--gap-lg);
          }
        }

        &[data-sd-inline="true"] {
          display: inline-block;
          vertical-align: top;

          > textarea,
          > ._contents {
            width: auto;
            vertical-align: top;
          }
        }

        &[data-sd-inset="true"] {
          > ._contents {
            display: block;
          }

          > textarea {
            position: absolute;
            top: 0;
            left: 0;
          }

          > textarea,
          > ._contents {
            width: 100%;
            border: none;
            border-radius: 0;
          }

          > textarea:focus {
            outline: 1px solid var(--theme-primary-default);
            outline-offset: -1px;
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
      }
    `,
  ],
  host: {
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-readonly]": "readonly()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-theme]": "theme()",
  },
})
export class SdTextareaControl {
  value = model<string>();

  placeholder = input<string>();
  title = input<string>();
  minRows = input<number>(1);
  disabled = input(false, { transform: transformBoolean });
  readonly = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();
  validatorFn = input<(value: string | undefined) => string | undefined>();
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();
  inputStyle = input<string>();
  inputClass = input<string>();

  currRows = $computed(() => Math.max(this.minRows(), this.value()?.split("\n").length ?? 1));

  constructor() {
    setupInvalid(() => {
      const errorMessages: string[] = [];
      if (this.value() == null) {
        if (this.required()) {
          errorMessages.push("값을 입력하세요.");
        }
      }

      if (this.validatorFn()) {
        const message = this.validatorFn()!(this.value());
        if (message !== undefined) {
          errorMessages.push(message);
        }
      }

      return errorMessages.join("\r\n");
    });
  }

  onInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;

    this.value.set(inputEl.value === "" ? undefined : inputEl.value);
  }
}
