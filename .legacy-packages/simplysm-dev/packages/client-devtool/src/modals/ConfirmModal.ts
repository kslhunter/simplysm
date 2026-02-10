import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from "@angular/core";
import {
  $signal,
  ISdModal,
  SdButtonControl,
  SdFormControl,
  SdTextfieldControl,
} from "@simplysm/sd-angular";

@Component({
  selector: "confirm-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdButtonControl, SdTextfieldControl, SdFormControl],
  template: `
    <div class="flex-column">
      <div class="flex-fill p-lg">
        <sd-form #formCtrl (submit)="onSubmit()">
          <div [innerHTML]="innerHTML()"></div>

          @if (placeholder() != null) {
            <br />
            <sd-textfield type="text" [(value)]="value" required [placeholder]="placeholder()" />
          }
        </sd-form>
      </div>
      <div class="p-sm-lg flex-row flex-gap-sm" style="justify-content: end">
        <sd-button theme="danger" size="sm" (click)="close.emit(undefined)">취소</sd-button>
        <sd-button theme="primary" size="sm" (click)="formCtrl.requestSubmit()">확인</sd-button>
      </div>
    </div>
  `,
})
export class ConfirmModal implements ISdModal<string> {
  innerHTML = input.required<string>();
  placeholder = input<string>();
  close = output<string | undefined>();

  initialized = $signal(true);

  value = $signal<string>();

  onSubmit() {
    this.close.emit(this.value() ?? "");
  }
}
