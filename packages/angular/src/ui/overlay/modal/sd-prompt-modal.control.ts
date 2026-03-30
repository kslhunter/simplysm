import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import type { ISdModal } from "./sd-modal.provider";
import { SdButtonControl } from "../../form/button/sd-button.control";

/**
 * 범용 프롬프트 모달.
 * ISdModal<string> 구현. message를 표시하고, 텍스트 입력 후 확인/취소.
 * 확인 시 입력값 emit, 취소 시 undefined emit.
 */
@Component({
  selector: "sd-prompt-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdButtonControl],
  template: `
    <div class="_sd-prompt-modal">
      <p class="_message">{{ message() }}</p>
      <input
        class="_input"
        type="text"
        [value]="_inputValue()"
        (input)="onInputChange($event)"
        (keydown.enter)="onConfirm()"
      />
      <div class="_actions">
        <sd-button [theme]="'primary'" (click)="onConfirm()">확인</sd-button>
        <sd-button (click)="onCancel()">취소</sd-button>
      </div>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-prompt-modal {
        display: block;
        padding: var(--gap-default);

        > ._sd-prompt-modal {
          > ._message {
            margin-bottom: var(--gap-default);
          }

          > ._input {
            display: block;
            width: 100%;
            padding: var(--gap-sm) var(--gap-default);
            border: 1px solid var(--trans-lighter);
            border-radius: var(--border-radius-default);
            margin-bottom: var(--gap-default);
          }

          > ._actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--gap-sm);
          }
        }
      }
    `,
  ],
})
export class SdPromptModalControl implements ISdModal<string> {
  initialized = signal(true);
  close = output<string | undefined>();

  message = input.required<string>();

  _inputValue = signal("");

  onInputChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this._inputValue.set(inputEl.value);
  }

  onConfirm(): void {
    const val = this._inputValue();
    if (val !== "") {
      this.close.emit(val);
    }
  }

  onCancel(): void {
    this.close.emit(undefined);
  }
}
