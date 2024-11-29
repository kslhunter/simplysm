import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from "@angular/core";
import Quill from "quill";
import QuillResizeImage from "quill-resize-image";
import { $effect, $model } from "../utils/$hooks";
import { injectElementRef } from "../utils/injectElementRef";
import { transformBoolean } from "../utils/transforms";

Quill.register("modules/resize", QuillResizeImage);

/**
 * Quill 에디터 컨트롤
 *
 * 텍스트 에디터 기능을 제공하는 컴포넌트입니다.
 *
 * @example
 *
 * <sd-quill-editor [(value)]="content"
 *                  [disabled]="false">
 * </sd-quill-editor>
 *
 *
 * @remarks
 * - 이미지 리사이즈 기능을 지원합니다
 * - 기본적인 텍스트 서식 도구를 제공합니다
 * - 테마 스타일이 적용된 UI를 제공합니다
 */
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
  /** HTML 엘리먼트 참조 */
  #elRef = injectElementRef<HTMLElement>();

  /** 에디터의 현재 값 */
  _value = input<string | undefined>(undefined, { alias: "value" });
  /** 에디터 값 변경 이벤트 */
  _valueChange = output<string | undefined>({ alias: "valueChange" });
  /** 양방향 바인딩을 위한 모델 */
  value = $model(this._value, this._valueChange);

  /** 에디터 비활성화 여부 */
  disabled = input(false, { transform: transformBoolean });

  /** Quill 에디터 인스턴스 */
  #quill!: Quill;

  constructor() {
    $effect([], () => {
      // Quill 에디터 초기화
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

      // 입력 이벤트 핸들러
      this.#quill.root.addEventListener("input", () => {
        const newValue = this.#quill.root.innerHTML;
        this.value.set(newValue === "" ? undefined : newValue);
      });

      // 텍스트 변경 이벤트 핸들러
      this.#quill.on("text-change", () => {
        const newValue = this.#quill.root.innerHTML;
        this.value.set(newValue === "" ? undefined : newValue);
      });
    });

    // 외부 값 변경 시 에디터 내용 동기화
    $effect(() => {
      if (this.#quill.root.innerHTML !== (this.value() ?? "")) {
        this.#quill.root.innerHTML = this.value() ?? "";
      }
    });

    // 비활성화 상태 변경 시 에디터 활성화/비활성화
    $effect(() => {
      this.#quill.enable(!this.disabled());
    });
  }
}
