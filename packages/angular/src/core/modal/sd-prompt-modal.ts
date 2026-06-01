import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import type { SdModalContentDef } from "./sd-modal.provider";
import { SdButton } from "../../controls/button/sd-button";
import { SdTextfield } from "../../controls/input/sd-textfield";
import { SdForm } from "../../controls/form/sd-form";

/**
 * 범용 프롬프트 모달.
 * SdModalContentDef<string> 구현. message를 표시하고, 텍스트 입력 후 확인/취소.
 * 확인 시 입력값 emit, 취소 시 undefined emit.
 * 입력값은 필수(required)이며, 빈 값으로 확인 시 sd-form 네이티브 검증으로 차단된다.
 */
@Component({
  selector: "sd-prompt-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdForm, SdButton, SdTextfield],
  host: {
    style: "display: block",
    class: "p-default",
  },
  template: `
    <sd-form (formSubmit)="onConfirm()">
      <p class="mb-default" [innerHTML]="message()"></p>
      <sd-textfield [type]="'text'" [(value)]="_inputValue" [required]="true" class="mb-default" />
      <div class="flex-row main-align-end gap-sm">
        <sd-button [type]="'submit'" [theme]="'primary'">확인</sd-button>
        <sd-button (click)="onCancel()">취소</sd-button>
      </div>
    </sd-form>
  `,
})
export class SdPromptModal implements SdModalContentDef<string> {
  initialized = signal(true);
  close = output<string | undefined>();

  message = input.required<string>();

  _inputValue = signal<string | undefined>(undefined);

  onConfirm(): void {
    this.close.emit(this._inputValue());
  }

  onCancel(): void {
    this.close.emit(undefined);
  }
}
