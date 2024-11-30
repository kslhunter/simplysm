import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { StringUtil } from "@simplysm/sd-core-common";
import { $computed, $effect, $model } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";

/**
 * 콘텐츠 편집기 컨트롤
 * 
 * 예제:
 * ```html
 * <sd-content-editor [(value)]="content" />
 * ```
 * 
 * @property value - 편집기의 내용
 * @property size - 크기 설정 ("sm" | "lg") (기본값: undefined)
 * @property disabled - 비활성화 여부 (기본값: false)
 * @property valueChange - 내용이 변경될 때 발생하는 이벤트
 */
@Component({
  selector: "sd-content-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
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
    <div class="_invalid-indicator"></div>
  `,
  host: {
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-readonly]": "readonly()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-inset]": "inset()",
    "[attr.sd-size]": "size()",
    "[attr.sd-invalid]": "errorMessage()",
  },
})
export class SdContentEditorControl {
  /** 컨트롤의 값 */
  _value = input<string | undefined>(undefined, { alias: "value" });
  /** 값 변경 이벤트 */
  _valueChange = output<string | undefined>({ alias: "valueChange" });
  /** 양방향 바인딩을 위한 모델 */
  value = $model(this._value, this._valueChange);

  /** 비활성화 여부 (기본값: false) */
  disabled = input(false, { transform: transformBoolean });
  /** 읽기 전용 여부 (기본값: false) */
  readonly = input(false, { transform: transformBoolean });
  /** 필수 입력 여부 (기본값: false) */
  required = input(false, { transform: transformBoolean });
  /** 유효성 검사 함수 */
  validatorFn = input<(value: string | undefined) => string | undefined>();

  /** 인라인 모드 여부 (기본값: false) */
  inline = input(false, { transform: transformBoolean });
  /** 내부 삽입 모드 여부 (기본값: false) */
  inset = input(false, { transform: transformBoolean });
  /** 컨트롤의 크기 ("sm" | "lg") */
  size = input<"sm" | "lg">();

  /** 에디터 스타일 */
  editorStyle = input<string>();

  /** 에디터 요소에 대한 참조 */
  editorElRef = viewChild.required<any, ElementRef<HTMLDivElement>>("editorEl", { read: ElementRef });

  /** 오류 메시지 계산 */
  errorMessage = $computed(() => {
    const errorMessages: string[] = [];
    if (this.value() == null && this.required()) {
      errorMessages.push("값을 입력하세요.");
    }
    else if (this.validatorFn()) {
      const message = this.validatorFn()!(this.value());
      if (message !== undefined) {
        errorMessages.push(message);
      }
    }

    const fullErrorMessage = errorMessages.join("\r\n");
    return StringUtil.isNullOrEmpty(fullErrorMessage) ? undefined : fullErrorMessage;
  });

  constructor() {
    // 값이 변경될 때마다 에디터 내용 업데이트
    $effect(() => {
      const innerHTML = this.editorElRef().nativeElement.innerHTML;
      if (innerHTML !== this.value()) {
        this.editorElRef().nativeElement.innerHTML = this.value() ?? "";
      }
    });
  }

  /** 에디터가 포커스를 받았을 때 커서를 맨 끝으로 이동 */
  onEditorFocus() {
    if (!this.readonly()) {
      const selection = window.getSelection()!;
      selection.removeAllRanges();

      const range = document.createRange();
      range.selectNodeContents(this.editorElRef().nativeElement);

      selection.setPosition(this.editorElRef().nativeElement, range.endOffset);
    }
  }

  /** 에디터 내용이 변경될 때 값 업데이트 */
  onInput() {
    const editorEl = this.editorElRef().nativeElement;

    let value: string | undefined;
    if (editorEl.innerHTML === "") {
      value = undefined;
    }
    else {
      value = editorEl.innerHTML;
    }

    this.value.set(value);
  }
}
