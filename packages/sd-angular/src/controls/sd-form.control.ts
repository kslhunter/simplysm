import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdToastProvider } from "../providers/sd-toast.provider";
import { SdEventsDirective } from "../directives/sd-events.directive";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective],
  template: `
    <form
      #formEl
      novalidate
      (submit)="_onSubmit($event)"
      (invalid.capture)="_onInvalidCapture()"
    >
      <ng-content />
      <button hidden type="submit"></button>
    </form>
  `,
})
export class SdFormControl {
  private _sdToast = inject(SdToastProvider);

  protected _formElRef = viewChild.required<any, ElementRef<HTMLFormElement>>(
    "formEl",
    { read: ElementRef },
  );

  protected get _formEl() {
    return this._formElRef().nativeElement;
  }

  submit = output<SubmitEvent>();
  invalid = output();

  requestSubmit() {
    this._formEl.requestSubmit();
  }

  protected _onSubmit(event: SubmitEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this._formEl.checkValidity()) {
      this.submit.emit(event);
      return;
    }

    // 자동 메시지 및 포커싱
    this._formEl.reportValidity();

    // const firstInvalidEl = this._formEl.findFirst<HTMLInputElement>("*:invalid")!;
    // this._sdToast.info(firstInvalidEl.validationMessage);

    this.invalid.emit();
  }

  protected _onInvalidCapture() {
    this.invalid.emit();
  }
}
