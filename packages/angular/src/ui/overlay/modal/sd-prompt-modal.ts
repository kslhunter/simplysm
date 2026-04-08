import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import type { SdModalContentDef } from "./sd-modal.provider";
import { SdButton } from "../../form/button/sd-button";
import { SdTextfield } from "../../form/input/sd-textfield";

/**
 * 범용 프롬프트 모달.
 * SdModalContentDef<string> 구현. message를 표시하고, 텍스트 입력 후 확인/취소.
 * 확인 시 입력값 emit, 취소 시 undefined emit.
 */
@Component({
  selector: "sd-prompt-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdButton, SdTextfield],
  host: {
    style: "display: block",
    class: "p-default",
  },
  template: `
    <p class="mb-default" [innerHTML]="message()"></p>
    <sd-textfield
      [type]="'text'"
      [value]="_inputValue()"
      (input)="onInputChange($event)"
      (keydown.enter)="onConfirm()"
      class="mb-default"
    />
    <div class="flex-row main-align-end gap-sm">
      <sd-button [theme]="'primary'" (click)="onConfirm()">확인</sd-button>
      <sd-button (click)="onCancel()">취소</sd-button>
    </div>
  `,
})
export class SdPromptModal implements SdModalContentDef<string> {
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
