import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { setupInvalid } from "../../core/validation/setupInvalid";

@Component({
  selector: "sd-textarea",
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
      @if (value()) {
        <pre>{{ value() }} </pre>
      } @else if (placeholder()) {
        <span class="tx-faint">{{ placeholder() }}</span>
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
      @use "../../../scss/commons/variables";
      @use "../../../scss/commons/mixins";

      sd-textarea {
        display: block;
        position: relative;

        > textarea,
        > ._contents {
          @include mixins.form-control-base();
          font-family: var(--sd-font-family-field);
          resize: none;

          overflow: auto;
          width: 100%;

          border: 1px solid var(--sd-bd-field);
          border-radius: var(--sd-radius-default);
          background-color: var(--sd-bg-field);

          &:focus {
            outline: none;
            border-color: var(--sd-focus-ring-color);
          }

          &::-webkit-scrollbar {
            display: none;
          }

          &::-webkit-input-placeholder {
            color: var(--sd-tx-faint);
          }
        }

        > ._contents > pre {
          font-family: inherit;
        }

        &:not([data-sd-inset="true"]):not([data-sd-disabled="true"]) > ._contents {
          height: 0;
          max-height: 0;
          padding-top: 0;
          padding-bottom: 0;
          margin-top: 0;
          margin-bottom: 0;
        }

        @each $key in variables.$theme-keys {
          &[data-sd-theme="#{$key}"] {
            > textarea,
            > ._contents {
              background-color: var(--sd-bg-#{$key}-subtle);
            }
          }
        }

        &[data-sd-size="sm"] {
          > textarea,
          > ._contents {
            padding: var(--sd-gap-xs) var(--sd-gap-sm);
          }
        }

        &[data-sd-size="lg"] {
          > textarea,
          > ._contents {
            padding: var(--sd-gap-default) var(--sd-gap-lg);
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
            outline: 1px solid var(--sd-focus-ring-color);
            outline-offset: -1px;
          }
        }

        // disabled 는 색 치환 단일 규약 (DEC-009)
        &[data-sd-disabled="true"] {
          > ._contents {
            display: block;
            background-color: var(--sd-bg-disabled);
            color: var(--sd-tx-disabled);
          }

          // inset(시트 셀 등)의 disabled 는 일반 콘텐츠처럼 표시(현행 유지)
          &[data-sd-inset="true"] {
            > ._contents {
              background-color: var(--sd-bg-control);
              color: var(--sd-tx-default);
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
export class SdTextarea {
  value = model<string>();

  placeholder = input<string>();
  title = input<string>();
  minRows = input<number>(1);
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  validatorFn = input<(value: string | undefined) => string | undefined>();
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();
  inputStyle = input<string>();
  inputClass = input<string>();

  currRows = computed(() => Math.max(this.minRows(), this.value()?.split("\n").length ?? 1));

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
        if (message != null) {
          errorMessages.push(message);
        }
      }

      return errorMessages.join("\r\n");
    });
  }

  onInput(event: Event): void {
    const inputEl = event.target as HTMLTextAreaElement;

    this.value.set(inputEl.value === "" ? undefined : inputEl.value);
  }
}
