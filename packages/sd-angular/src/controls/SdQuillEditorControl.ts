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
import Quill from "quill";
import { coercionBoolean } from "../utils/commons";
import QuillResizeImage from "quill-resize-image";
import { sdCheck, sdInit } from "../utils/hooks";

Quill.register("modules/resize", QuillResizeImage);

@Component({
  selector: "sd-quill-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <div></div> `,
  styles: [
    /* language=SCSS */ `
      sd-quill-editor {
        display: block;
        border: 1px solid var(--theme-grey-lighter);
        border-radius: var(--border-radius-default);

        > .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid var(--theme-grey-lighter) !important;
          padding: var(--gap-sm) var(--gap-default) !important;

          button {
            font-size: var(--font-size-default);
            height: 1.75em !important;
            width: 2em !important;
            padding: var(--gap-xs) var(--gap-sm) !important;

            &:hover {
              color: var(--theme-primary-default) !important;
            }

            &.ql-active {
              color: var(--theme-primary-default) !important;
            }
          }
        }

        > .ql-container {
          border: none !important;
          background: var(--theme-secondary-lightest) !important;
          border-bottom-left-radius: var(--border-radius-default);
          border-bottom-right-radius: var(--border-radius-default);

          > .ql-editor {
            padding: var(--gap-lg) !important;
            min-height: 4em;
          }
        }

        &[sd-disabled1="true"] {
          border: none;

          > .ql-toolbar {
            display: none !important;
          }

          > .ql-container {
            border-top-left-radius: var(--border-radius-default);
            border-top-right-radius: var(--border-radius-default);
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-disabled]": "disabled",
  },
})
export class SdQuillEditorControl {
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() value?: string;
  @Output() valueChange = new EventEmitter<string | undefined>();

  @Input({ transform: coercionBoolean }) disabled = false;

  #quill!: Quill;

  constructor() {
    sdInit(() => {
      this.#quill = new Quill(this.#elRef.nativeElement.firstElementChild as HTMLElement, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: 1 }, { header: 2 }, "bold", "italic", "underline", "strike"],

            [{ color: [] }, { background: [] }],

            [{ list: "ordered" }, { list: "bullet" }],

            [{ indent: "-1" }, { indent: "+1" }],

            ["blockquote", "code-block"],
            [{ align: "" }, { align: "center" }, { align: "right" }, { align: "justify" }],

            ["clean"],
          ],
          resize: {},
        },
      });

      this.#quill.root.addEventListener("input", () => {
        const newValue = this.#quill.root.innerHTML;
        if (this.value !== newValue) {
          this.value = newValue;
          this.valueChange.emit(newValue);
        }
      });

      this.#quill.on("text-change", () => {
        const newValue = this.#quill.root.innerHTML;
        if (this.value !== newValue) {
          this.value = newValue;
          this.valueChange.emit(newValue);
        }
      });
    });

    sdCheck.outside(
      () => ({
        value: [this.value],
      }),
      () => {
        if (this.value == null) {
          this.#quill.root.innerHTML = "";
        } else if (this.value != this.#quill.root.innerHTML) {
          this.#quill.root.innerHTML = this.value;
        }
      },
    );

    sdCheck.outside(
      () => ({
        disabled: [this.disabled],
      }),
      () => {
        this.#quill.enable(!this.disabled);
      },
    );
  }
}
