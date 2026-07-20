import { isPlatformBrowser } from "@angular/common";
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  PLATFORM_ID,
  signal,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { setupInvalid } from "../../core/validation/setupInvalid";
import { textfieldTypeHandlers, type SdTextfieldTypes } from "./sd-textfield-type-handlers";

@Component({
  selector: "sd-textfield",
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
      @if (controlType() === "password") {
        <span class="tx-muted">****</span>
      } @else {
        @if (controlValue()) {
          <pre>{{ controlValueText() ? controlValueText() : " " }}</pre>
        } @else if (placeholder()) {
          <span class="tx-faint">{{ placeholder() }}</span>
        } @else {
          <span>&nbsp;</span>
        }
      }
    </div>
    @if (!readonly() && !disabled()) {
      <input
        #inputEl
        [style]="inputStyle()"
        [class]="inputClass()"
        [attr.title]="title() ?? placeholder()"
        [attr.placeholder]="placeholder()"
        [attr.min]="min()"
        [attr.max]="max()"
        [type]="controlType()"
        [attr.inputmode]="type() === 'number' ? 'numeric' : undefined"
        [attr.autocomplete]="autocomplete()"
        [attr.step]="controlStep()"
        (input)="onInput($event)"
        (compositionstart)="onCompositionStart()"
        (compositionend)="onCompositionEnd($event)"
        (blur)="onBlur($event)"
      />
    }
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";
      @use "../../../scss/commons/mixins";

      sd-textfield {
        display: block;
        position: relative;

        > input,
        > ._contents {
          @include mixins.form-control-base();
          font-family: var(--sd-font-family-field);

          overflow: auto;
          width: 100%;

          border: 1px solid var(--sd-bd-field);
          border-radius: var(--sd-radius-default);
          background-color: var(--sd-bg-field);

          &:focus {
            outline: none;
            border-color: var(--sd-focus-ring-color);
          }

          &[type="date"],
          &[type="month"],
          &[type="datetime-local"] {
            padding-top: calc(var(--sd-gap-sm) - 1px);
            padding-bottom: calc(var(--sd-gap-sm) - 1px);
          }

          &::-webkit-scrollbar {
            display: none;
          }

          &::-webkit-input-placeholder {
            color: var(--sd-tx-faint);
          }

          &::-webkit-outer-spin-button,
          &::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          &::-webkit-calendar-picker-indicator {
            cursor: pointer;
            margin: auto;
          }
        }

        > ._contents {
          display: none;
        }

        > ._contents > pre {
          font-family: inherit;
        }

        &[data-sd-type="number"] {
          > input,
          > ._contents {
            text-align: right;
          }
        }

        @each $key in variables.$theme-keys {
          &[data-sd-theme="#{$key}"] {
            > input,
            > ._contents {
              background-color: var(--sd-bg-#{$key}-subtle);
            }
          }
        }

        &[data-sd-size="sm"] {
          > input,
          > ._contents {
            padding: var(--sd-gap-xs) var(--sd-gap-sm);

            &[type="date"],
            &[type="month"],
            &[type="datetime-local"],
            &[type="color"] {
              padding-top: calc(var(--sd-gap-xs) - 1px);
              padding-bottom: calc(var(--sd-gap-xs) - 1px);
            }
          }
        }

        &[data-sd-size="lg"] {
          > input,
          > ._contents {
            padding: var(--sd-gap-default) var(--sd-gap-lg);

            &[type="date"],
            &[type="month"],
            &[type="datetime-local"],
            &[type="color"] {
              padding-top: calc(var(--sd-gap-default) - 1px);
              padding-bottom: calc(var(--sd-gap-default) - 1px);
            }
          }
        }

        &[data-sd-inline="true"] {
          display: inline-block;
          vertical-align: top;

          > input,
          > ._contents {
            width: auto;
            vertical-align: top;
          }
        }

        &[data-sd-inset="true"] {
          > ._contents {
            display: block;
          }

          > input {
            position: absolute;
            top: 0;
            left: 0;
          }

          > input,
          > ._contents {
            width: 100%;
            border: none;
            border-radius: 0;
          }

          > input:focus {
            outline: 1px solid var(--sd-focus-ring-color);
            outline-offset: -1px;
          }

          &[data-sd-type="month"] {
            > input,
            > ._contents {
              min-width: 8.25em;
            }
          }

          &[data-sd-type="date"] {
            > input,
            > ._contents {
              min-width: 8.25em;
            }
          }

          &[data-sd-type="datetime-local"] {
            > input,
            > ._contents {
              min-width: 14em;
            }
          }

          &[data-sd-type="year"] {
            > input,
            > ._contents {
              min-width: 4em;
            }
          }

          &[data-sd-type="color"] {
            > input,
            > ._contents {
              height: calc(
                var(--sd-font-size-default) * var(--sd-line-height-strip-unit) + var(--sd-gap-sm) *
                  2
              );
            }

            &[data-sd-size="sm"] {
              > input,
              > ._contents {
                height: calc(
                  var(--sd-font-size-default) * var(--sd-line-height-strip-unit) +
                    var(--sd-gap-xs) * 2
                );
              }
            }

            &[data-sd-size="lg"] {
              > input,
              > ._contents {
                height: calc(
                  var(--sd-font-size-default) * var(--sd-line-height-strip-unit) +
                    var(--sd-gap-default) * 2
                );
              }
            }
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
              background-color: var(--sd-bg-content);
              color: var(--sd-tx-default);
            }
          }
        }

        &[data-sd-readonly="true"] {
          > ._contents {
            display: block;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-type]": "type()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-readonly]": "readonly()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-theme]": "theme()",
  },
})
export class SdTextfield<K extends keyof SdTextfieldTypes> {
  value = model<SdTextfieldTypes[K]>();

  type = input.required<K>();
  placeholder = input<string>();
  title = input<string>();
  inputStyle = input<string>();
  inputClass = input<string>();

  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });

  required = input(false, { transform: booleanAttribute });
  min = input<SdTextfieldTypes[K]>();
  max = input<SdTextfieldTypes[K]>();
  minlength = input<number>();
  maxlength = input<number>();
  pattern = input<string>();
  validatorFn = input<(value: SdTextfieldTypes[K] | undefined) => string | undefined>();
  format = input<string>();

  step = input<number>();
  autocomplete = input<string>();
  useNumberComma = input(true, { transform: booleanAttribute });
  minDigits = input<number>();

  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  theme = input<"primary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();

  private readonly _inputElRef = viewChild<ElementRef<HTMLInputElement>>("inputEl");

  // 실제 input 의 브라우저 native 제약 위반(이메일 형식, 날짜 미완성 등) 메시지. onInput/onBlur 에서 갱신.
  private readonly _nativeInvalidMessage = signal("");

  // IME 조합(한글 등) 중 여부. 조합 중에는 미완성 자모가 model 로 흐르지 않도록 갱신을 보류.
  private _composing = false;

  private readonly _handler = computed(() => textfieldTypeHandlers[this.type()]);

  controlType = computed(() => this._handler().controlType);

  controlStep = computed(() => this._handler().getControlStep(this.step()));

  controlValue = computed(() => {
    const value = this.value();
    if (value == null) return "";
    return this._handler().toControlValue(value, {
      useNumberComma: this.useNumberComma(),
      format: this.format(),
    });
  });

  controlValueText = computed(() => {
    const value = this.value();
    if (value == null) return undefined;
    return (
      this._handler().toDisplayText(value, {
        minDigits: this.minDigits(),
      }) ?? this.controlValue()
    );
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      effect(() => {
        const controlValue = this.controlValue();
        const inputEl = this._inputElRef()?.nativeElement;
        if (inputEl == null) return;

        // IME 조합 중에는 DOM 을 되쓰지 않는다. 되쓰면 진행 중 조합이 깨진다.
        // 조합이 끝나면 onCompositionEnd → value.set 이 controlValue 를 바꿔 effect 가 다시 돌아 최종값을 반영한다.
        if (this._composing) return;

        // 편집(포커스) 중이라도 변경 origin 을 구분한다.
        // 사용자 입력이 만든 DOM(정규화 차이, 진행 중 입력 포함)은 보호하고,
        // 모델만 외부에서 바뀐 경우(프로그래밍적 리셋, prefill, 표시옵션 변경)는 되써서 반영한다.
        if (document.activeElement === inputEl) {
          const domParsed = this._handler().parse(inputEl.value, { format: this.format() });
          // DOM raw 가 현재 모델의 유효한 표현이면(사용자 입력 유래) 되쓰지 않아 캐럿, IME 보호
          const domReflectsModel =
            domParsed != null &&
            this._handler().toControlValue(domParsed, {
              useNumberComma: this.useNumberComma(),
              format: this.format(),
            }) === controlValue;
          // 계속 입력하면 유효해질 진행 중 입력(number "12.")도 보호
          const incomplete =
            this._handler().isIncomplete?.(inputEl.value, { format: this.format() }) === true;
          if (domReflectsModel || incomplete) return;
        }

        if (inputEl.value !== controlValue) {
          inputEl.value = controlValue;
        }
      });
    }

    setupInvalid(() => {
      // 검증은 편집 가능 여부와 무관하다. disabled, readonly 여도 값이 제약을 어기면 invalid 다.
      // 값이 무의미한 맥락이면 소비자가 제약(required 등)을 함께 내려야 한다.
      const value = this.value();
      const handlerErrors = this._handler().validate(value, {
        required: this.required(),
        min: this.min(),
        max: this.max(),
        minlength: this.minlength(),
        maxlength: this.maxlength(),
        pattern: this.pattern(),
        format: this.format(),
      });

      const errorMessages = [...handlerErrors];

      if (this.validatorFn()) {
        const message = this.validatorFn()!(value);
        if (message != null) {
          errorMessages.push(message);
        }
      }

      // 브라우저 native 제약 위반(이메일 형식, 날짜 미완성 등)을 우리 검증(빨간점)에 합류
      const nativeMessage = this._nativeInvalidMessage();
      if (nativeMessage !== "") {
        errorMessages.push(nativeMessage);
      }

      return errorMessages.join("\r\n");
    });
  }

  onCompositionStart(): void {
    this._composing = true;
  }

  onCompositionEnd(event: CompositionEvent): void {
    this._composing = false;
    this._applyInput(event.target as HTMLInputElement);
  }

  onInput(event: Event): void {
    // 조합 중 input 은 무시하고, 완성 시 onCompositionEnd 에서 한 번만 반영
    // isComposing 은 compositionstart 가 늦거나 누락된 IME 에서도 브라우저가 조합 구간 input 에 직접 실어주는 신호
    if ((event as InputEvent).isComposing || this._composing) return;
    this._applyInput(event.target as HTMLInputElement);
  }

  private _applyInput(inputEl: HTMLInputElement): void {
    if (inputEl.value === "") {
      this.value.set(undefined);
    } else {
      const parsed = this._handler().parse(inputEl.value, { format: this.format() });
      if (parsed == null) {
        // 계속 입력하면 유효해질 진행 중 입력(number "12.", "-")은 되쓰지 않아 입력을 이어가게 함
        if (this._handler().isIncomplete?.(inputEl.value, { format: this.format() }) !== true) {
          inputEl.value = this.controlValue();
        }
      } else {
        this.value.set(parsed as SdTextfieldTypes[K]);
      }
    }
    this._syncNativeValidity(inputEl);
  }

  onBlur(event: FocusEvent): void {
    // 편집 종료 시 모델 기준값으로 동기화 (number 콤마 포맷 반영, date 미완성 입력 정리)
    // date 미완성 입력은 input.value 가 "" 라 비교 없이 무조건 되써야 남은 세그먼트가 정리됨
    // compositionend 가 스킵된 채 blur 되면 _composing 이 true 로 고착되므로 여기서 리셋한다.
    this._composing = false;
    const inputEl = event.target as HTMLInputElement;
    inputEl.value = this.controlValue();
    this._syncNativeValidity(inputEl);
  }

  private _syncNativeValidity(inputEl: HTMLInputElement): void {
    // 실제 input 의 브라우저 native 제약 위반을 signal 로 반영 → setupInvalid 콜백이 검증에 합류
    this._nativeInvalidMessage.set(inputEl.validity.valid ? "" : inputEl.validationMessage);
  }
}
