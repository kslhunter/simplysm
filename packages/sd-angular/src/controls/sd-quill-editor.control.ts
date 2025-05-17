import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from "@angular/core";
import Quill from "quill";
import QuillResizeImage from "quill-resize-image";
import { injectElementRef } from "../utils/injections/inject-element-ref";
import { transformBoolean } from "../utils/type-tramsforms";
import { $model } from "../utils/bindings/$model";
import { $effect } from "../utils/bindings/$effect";

Quill.register("modules/resize", QuillResizeImage);

@Component({
  selector: "sd-quill-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div></div>`,
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
    "[attr.sd-disabled]": "disabled()",
  },
})
export class SdQuillEditorControl {
  private _elRef = injectElementRef<HTMLElement>();

  __value = input<string | undefined>(undefined, { alias: "value" });
  __valueChange = output<string | undefined>({ alias: "valueChange" });
  value = $model(this.__value, this.__valueChange);

  disabled = input(false, { transform: transformBoolean });

  private _quill!: Quill;

  constructor() {
    $effect([], () => {
      this._quill = new Quill(this._elRef.nativeElement.firstElementChild as HTMLElement, {
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

      this._quill.root.addEventListener("input", () => {
        const newValue = this._quill.root.innerHTML;
        this.value.set(newValue === "" ? undefined : newValue);
      });

      this._quill.on("text-change", () => {
        const newValue = this._quill.root.innerHTML;
        this.value.set(newValue === "" ? undefined : newValue);
      });
    });

    $effect(() => {
      if (this._quill.root.innerHTML !== (this.value() ?? "")) {
        this._quill.root.innerHTML = this.value() ?? "";
      }
    });

    $effect(() => {
      this._quill.enable(!this.disabled());
    });
  }
}
