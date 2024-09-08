import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewEncapsulation,
} from "@angular/core";
import { StringUtil } from "@simplysm/sd-core-common";
import { coercionBoolean, coercionNumber } from "../utils/commons";
import { sdGetter, TSdGetter } from "../utils/hooks";

@Component({
  selector: "sd-textarea",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div
      [style]="inputStyle"
      [class]="['_contents', inputClass].filterExists().join(' ')"
      [attr.title]="title ?? placeholder"
      [style.visibility]="!readonly && !disabled ? 'hidden' : undefined"
    >
      @if (value) {
        <pre>{{ value }}</pre>
      } @else {
        <span class="tx-trans-lighter">{{ placeholder }}</span>
      }
    </div>
    @if (!readonly && !disabled) {
      <textarea
        [value]="value ?? ''"
        [attr.placeholder]="placeholder"
        [required]="required"
        [attr.title]="title ?? placeholder"
        [attr.rows]="rows"
        (input)="onInput($event)"
        [style]="inputStyle"
        [class]="inputClass"
      ></textarea>
    }

    <div class="_invalid-indicator"></div>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";
      @import "../scss/mixins";

      sd-textarea {
        display: block;
        position: relative;

        > textarea,
        > ._contents {
          @include form-control-base();

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

        @each $key, $val in map-get($vars, theme) {
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
              background: white;
              color: var(--text-trans-default);
            }
          }
        }

        > ._invalid-indicator {
          display: none;
        }

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
    `,
  ],
  host: {
    "[attr.sd-disabled]": "disabled",
    "[attr.sd-readonly]": "readonly",
    "[attr.sd-inline]": "inline",
    "[attr.sd-inset]": "inset",
    "[attr.sd-size]": "size",
    "[attr.sd-theme]": "theme",
    "[attr.sd-invalid]": "getErrorMessage()",
  },
})
export class SdTextareaControl {
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() value?: string;
  @Output() valueChange = new EventEmitter<string | undefined>();

  @Input() placeholder?: string;
  @Input() title?: string;
  @Input({ transform: coercionNumber }) rows = 3;
  @Input({ transform: coercionBoolean }) disabled = false;
  @Input({ transform: coercionBoolean }) readonly = false;
  @Input({ transform: coercionBoolean }) required = false;
  @Input({ transform: coercionBoolean }) inline = false;
  @Input({ transform: coercionBoolean }) inset = false;
  @Input() size?: "sm" | "lg";
  @Input() validatorGetter?: TSdGetter<(value: string | undefined) => string | undefined>;
  @Input() theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";
  @Input() inputStyle?: string;
  @Input() inputClass?: string;

  getErrorMessage = sdGetter(this, [() => [this.value], () => [this.required], () => [this.validatorGetter]], () => {
    const errorMessages: string[] = [];
    if (this.value == null) {
      if (this.required) {
        errorMessages.push("값을 입력하세요.");
      }
    }

    if (this.validatorGetter) {
      const message = this.validatorGetter(this.value);
      if (message !== undefined) {
        errorMessages.push(message);
      }
    }

    const fullErrorMessage = errorMessages.join("\r\n");

    const inputEl = this.#elRef.nativeElement.findFirst("input");
    if (inputEl instanceof HTMLInputElement) {
      inputEl.setCustomValidity(fullErrorMessage);
    }

    return StringUtil.isNullOrEmpty(fullErrorMessage) ? undefined : fullErrorMessage;
  });

  onInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;

    if (inputEl.value === "") {
      this.#setValue(undefined);
    } else {
      this.#setValue(inputEl.value);
    }
  }

  #setValue(newValue: any): void {
    if (this.value !== newValue) {
      this.value = newValue;
      this.valueChange.emit(newValue);
    }
  }
}
