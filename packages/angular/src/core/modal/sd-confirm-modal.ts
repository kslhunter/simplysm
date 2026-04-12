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

/**
 * 범용 확인 모달.
 * SdModalContentDef<boolean> 구현. message를 표시하고, 확인/취소.
 * 확인 시 true emit, 취소 시 undefined emit.
 */
@Component({
  selector: "sd-confirm-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdButton],
  host: {
    style: "display: block",
    class: "p-default",
  },
  template: `
    <p class="mb-default" [innerHTML]="message()"></p>
    <div class="flex-row main-align-end gap-sm">
      <sd-button [theme]="'primary'" (click)="onConfirm()">확인</sd-button>
      <sd-button (click)="onCancel()">취소</sd-button>
    </div>
  `,
})
export class SdConfirmModal implements SdModalContentDef<boolean> {
  initialized = signal(true);
  close = output<boolean | undefined>();

  message = input.required<string>();

  onConfirm(): void {
    this.close.emit(true);
  }

  onCancel(): void {
    this.close.emit(undefined);
  }
}
