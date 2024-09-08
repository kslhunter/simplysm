import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import { coercionBoolean } from "../utils/commons";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { StringUtil } from "@simplysm/sd-core-common";
import { sdCheck, sdGetter, TSdGetter } from "../utils/hooks";

@Component({
  selector: "sd-content-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective],
  template: `
    <div
      #editorEl
      class="_editor"
      (input)="onInput()"
      [attr.contenteditable]="!disabled && !readonly"
      [title]="value"
      [style]="editorStyle"
      (focus.outside)="onEditorFocusOutside()"
    ></div>
    <div class="_invalid-indicator"></div>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-content-editor {
        display: block;
        position: relative;

        > ._editor {
          @include form-control-base();
          white-space: pre-wrap;

          background: var(--theme-secondary-lightest);
          border: 1px solid var(--trans-lighter);
          border-radius: var(--border-radius-default);

          min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

          &:focus {
            outline: none;
            border-color: var(--theme-primary-default);
          }
        }

        &[sd-disabled="true"] {
          > ._editor {
            background: var(--theme-grey-lightest);
            color: var(--text-trans-light);
          }
        }

        &[sd-size="sm"] {
          > ._editor {
            padding: var(--gap-xs) var(--gap-sm);
            min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
          }
        }

        &[sd-size="lg"] {
          > ._editor {
            padding: var(--gap-default) var(--gap-lg);
            min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
          }
        }

        &[sd-inline="true"] {
          display: inline-block;

          > ._editor {
            display: inline-block;
            width: auto;
            vertical-align: top;
          }
        }

        &[sd-inset="true"] {
          > ._editor {
            border: none;
            border-radius: 0;
          }

          &[sd-disabled="true"] {
            > ._editor {
              background: white !important;
              color: var(--text-trans-default);
            }
          }

          > ._editor {
            min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }

          &[sd-size="sm"] {
            > ._editor {
              min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
            }
          }

          &[sd-size="lg"] {
            > ._editor {
              min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
            }
          }

          > ._editor:focus {
            outline: 1px solid var(--theme-primary-default);
            outline-offset: -1px;
          }
        }

        > ._invalid-indicator {
          display: none;
        }

        &[sd-invalid="true"] {
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
    "[attr.sd-invalid]": "getErrorMessage()",
  },
})
export class SdContentEditorControl {
  @Input() value?: string;
  @Output() valueChange = new EventEmitter<string | undefined>();

  @Input({ transform: coercionBoolean }) disabled = false;
  @Input({ transform: coercionBoolean }) readonly = false;
  @Input({ transform: coercionBoolean }) required = false;
  @Input() validatorGetter?: TSdGetter<(value: string | undefined) => string | undefined>;

  @Input({ transform: coercionBoolean }) inline = false;
  @Input({ transform: coercionBoolean }) inset = false;
  @Input() size?: "sm" | "lg";

  @Input() editorStyle?: string;

  @ViewChild("editorEl", { static: true }) editorElRef!: ElementRef<HTMLDivElement>;

  getErrorMessage = sdGetter(this, [() => [this.value], () => [this.required], () => [this.validatorGetter]], () => {
    const errorMessages: string[] = [];
    if (this.value == null && this.required) {
      errorMessages.push("값을 입력하세요.");
    } else if (this.validatorGetter) {
      const message = this.validatorGetter(this.value);
      if (message !== undefined) {
        errorMessages.push(message);
      }
    }

    const fullErrorMessage = errorMessages.join("\r\n");
    return StringUtil.isNullOrEmpty(fullErrorMessage) ? undefined : fullErrorMessage;
  });

  constructor() {
    sdCheck.outside(this, [() => [this.value]], () => {
      const innerHTML = this.editorElRef.nativeElement.innerHTML;
      if (innerHTML !== this.value) {
        this.editorElRef.nativeElement.innerHTML = this.value ?? "";
      }
    });
  }

  onEditorFocusOutside() {
    if (!this.readonly) {
      const selection = window.getSelection()!;
      selection.removeAllRanges();

      const range = document.createRange();
      range.selectNodeContents(this.editorElRef.nativeElement);

      selection.setPosition(this.editorElRef.nativeElement, range.endOffset);
    }
  }

  onInput() {
    const editorEl = this.editorElRef.nativeElement;

    let value: string | undefined;
    if (editorEl.innerHTML === "") {
      value = undefined;
    } else {
      value = editorEl.innerHTML;
    }

    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(value);
    }
  }
}
