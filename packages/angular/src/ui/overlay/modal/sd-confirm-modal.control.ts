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
 * 범용 확인 모달.
 * ISdModal<boolean> 구현. message를 표시하고, 확인/취소.
 * 확인 시 true emit, 취소 시 undefined emit.
 */
@Component({
  selector: "sd-confirm-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdButtonControl],
  template: `
    <div class="_sd-confirm-modal">
      <p class="_message">{{ message() }}</p>
      <div class="_actions">
        <sd-button [theme]="'primary'" (click)="onConfirm()">확인</sd-button>
        <sd-button (click)="onCancel()">취소</sd-button>
      </div>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-confirm-modal {
        display: block;
        padding: var(--gap-default);

        > ._sd-confirm-modal {
          > ._message {
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
export class SdConfirmModalControl implements ISdModal<boolean> {
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
