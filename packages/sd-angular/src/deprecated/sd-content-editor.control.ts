import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { $effect } from "../utils/bindings/$effect";
import { setupInvalid } from "../utils/setups/setup-invalid";
import { transformBoolean } from "../utils/type-tramsforms";

/** @deprecated sd-quill-editor */
@Component({
  selector: "sd-content-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div
      #editorEl
      class="_editor"
      (input)="onInput()"
      [attr.contenteditable]="!disabled() && !readonly()"
      [title]="value()"
      [style]="editorStyle()"
      (focus)="onEditorFocus()"
    ></div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../scss/commons/mixins";

      sd-content-editor {
        display: block;
        position: relative;

        > ._editor {
          @include mixins.form-control-base();
          white-space: pre-wrap;

          background: var(--theme-secondary-lightest);
          border: 1px solid var(--trans-lighter);
          border-radius: var(--border-radius-default);

          min-height: calc(
            var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px
          );

          &:focus {
            outline: none;
            border-color: var(--theme-primary-default);
          }
        }

        &[data-sd-disabled="true"] {
          > ._editor {
            background: var(--theme-grey-lightest);
            color: var(--text-trans-light);
          }
        }

        &[data-sd-size="sm"] {
          > ._editor {
            padding: var(--gap-xs) var(--gap-sm);
            min-height: calc(
              var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px
            );
          }
        }

        &[data-sd-size="lg"] {
          > ._editor {
            padding: var(--gap-default) var(--gap-lg);
            min-height: calc(
              var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) +
                2px
            );
          }
        }

        &[data-sd-inline="true"] {
          display: inline-block;

          > ._editor {
            display: inline-block;
            width: auto;
            vertical-align: top;
          }
        }

        &[data-sd-inset="true"] {
          > ._editor {
            border: none;
            border-radius: 0;
          }

          &[data-sd-disabled="true"] {
            > ._editor {
              background: var(--control-color) !important;
              color: var(--text-trans-default);
            }
          }

          > ._editor {
            min-height: calc(
              var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit)
            );
          }

          &[data-sd-size="sm"] {
            > ._editor {
              min-height: calc(
                var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit)
              );
            }
          }

          &[data-sd-size="lg"] {
            > ._editor {
              min-height: calc(
                var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit)
              );
            }
          }

          > ._editor:focus {
            outline: 1px solid var(--theme-primary-default);
            outline-offset: -1px;
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
  },
})
export class SdContentEditorControl {
  value = model<string>();

  disabled = input(false, { transform: transformBoolean });
  readonly = input(false, { transform: transformBoolean });
  required = input(false, { transform: transformBoolean });
  validatorFn = input<(value: string | undefined) => string | undefined>();

  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();

  editorStyle = input<string>();

  editorElRef = viewChild.required<any, ElementRef<HTMLDivElement>>("editorEl", {
    read: ElementRef,
  });

  constructor() {
    setupInvalid(() => {
      const errorMessages: string[] = [];
      if (this.value() == null && this.required()) {
        errorMessages.push("값을 입력하세요.");
      } else if (this.validatorFn()) {
        const message = this.validatorFn()!(this.value());
        if (message !== undefined) {
          errorMessages.push(message);
        }
      }

      return errorMessages.join("\r\n");
    });

    $effect(() => {
      const innerHTML = this.editorElRef().nativeElement.innerHTML;
      if (innerHTML !== this.value()) {
        this.editorElRef().nativeElement.innerHTML = this.value() ?? "";
      }
    });
  }

  onEditorFocus() {
    if (!this.readonly()) {
      const selection = window.getSelection()!;
      selection.removeAllRanges();

      const range = document.createRange();
      range.selectNodeContents(this.editorElRef().nativeElement);

      selection.setPosition(this.editorElRef().nativeElement, range.endOffset);
    }
  }

  onInput() {
    const editorEl = this.editorElRef().nativeElement;

    let value: string | undefined;
    if (editorEl.innerHTML === "") {
      value = undefined;
    } else {
      value = editorEl.innerHTML;
    }

    this.value.set(value);
  }
}
