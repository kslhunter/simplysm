import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import Quill from "quill";
import QuillResizeImage from "quill-resize-image";
import { $effect } from "../../../core/utils/bindings/$effect";
import { injectElementRef } from "../../../core/utils/injections/injectElementRef";
import { transformBoolean } from "../../../core/utils/transforms/tramsformBoolean";

Quill.register("modules/resize", QuillResizeImage);

@Component({
  selector: "sd-quill-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div></div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-quill-editor {
        display: block;
        border: 1px solid var(--theme-gray-lighter);
        border-radius: var(--border-radius-default);

        > .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid var(--theme-gray-lighter) !important;
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

        &[data-sd-disabled1="true"] {
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
    "[attr.data-sd-disabled]": "disabled()",
  },
})
export class SdQuillEditorControl {
  #elRef = injectElementRef<HTMLElement>();

  value = model<string>();

  disabled = input(false, { transform: transformBoolean });

  #quill!: Quill;

  constructor() {
    $effect([], () => {
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
        this.value.set(newValue === "" ? undefined : newValue);
      });

      this.#quill.on("text-change", () => {
        const newValue = this.#quill.root.innerHTML;
        this.value.set(newValue === "" ? undefined : newValue);
      });
    });

    $effect(() => {
      if (this.#quill.root.innerHTML !== (this.value() ?? "")) {
        this.#quill.root.innerHTML = this.value() ?? "";
      }
    });

    $effect(() => {
      this.#quill.enable(!this.disabled());
    });
  }
}
