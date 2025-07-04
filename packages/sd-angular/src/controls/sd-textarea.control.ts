import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { setupInvalid } from "../utils/setups/setup-invalid";
import { transformBoolean } from "../utils/type-tramsforms";
import { $computed } from "../utils/bindings/$computed";

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

      @use "../scss/variables";
      @use "../scss/mixins";

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

        > ._contents {
          display: none;
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[sd-theme="#{$key}"] {
            > textarea,
            > ._contents {
              background: var(--theme-#{$key}-lightest);
            }
          }
        }

        &[sd-size="sm"] {
          > textarea,
          > ._contents {
            padding: var(--gap-xs) var(--gap-sm);
          }
        }

        &[sd-size="lg"] {
          > textarea,
          > ._contents {
            padding: var(--gap-default) var(--gap-lg);
          }
        }

        &[sd-inline="true"] {
          display: inline-block;
          vertical-align: top;

          > textarea,
          > ._contents {
            width: auto;
            vertical-align: top;
          }
        }

        &[sd-inset="true"] {
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

        &[sd-disabled="true"] {
          > ._contents {
            display: block;
            background: var(--theme-grey-lightest);
            color: var(--text-trans-light);
          }

          &[sd-inset="true"] {
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
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-readonly]": "readonly()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-inset]": "inset()",
    "[attr.sd-size]": "size()",
    "[attr.sd-theme]": "theme()",
  },
})
export class SdTextareaControl {
  value = model<string>();

  placeholder = input<string>();
  title = input<string>();
  // rows = input<number>(1);
  disabled = input(false, { transform: transformBoolean });
  readonly = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();
  validatorFn = input<(value: string | undefined) => string | undefined>();
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();
  inputStyle = input<string>();
  inputClass = input<string>();

  currRows = $computed(() => this.value()?.split("\n").length ?? 1);

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
