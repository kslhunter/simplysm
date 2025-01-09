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
    <form #formEl (submit)="onSubmit($event)" (invalid.capture)="onInvalidCapture()">
      <ng-content />
      <button hidden type="submit"></button>
    </form>
  `,
})
export class SdFormControl {
  #sdToast = inject(SdToastProvider);

  formElRef = viewChild.required<any, ElementRef<HTMLFormElement>>("formEl", { read: ElementRef });

  submit = output<SubmitEvent>();
  invalid = output();

  requestSubmit() {
    this.formElRef().nativeElement.requestSubmit();
  }

  onSubmit(event: SubmitEvent) {
    event.preventDefault();
    event.stopPropagation();

    const firstInvalidEl = this.formElRef().nativeElement.findFirst<HTMLElement>("*:invalid, *[sd-invalid-message]");

    if (!firstInvalidEl) {
      this.submit.emit(event);
      return;
    }

    const sdInvalidMessage = firstInvalidEl.getAttribute("sd-invalid-message");
    const invalidMessage = "validationMessage" in firstInvalidEl ? firstInvalidEl.validationMessage : "";

    const errorMessage = [sdInvalidMessage, invalidMessage].filterExists().join("\n");

    const focusableElement =
      (firstInvalidEl.isFocusable() ? firstInvalidEl : firstInvalidEl.findFocusableAll().first()) ??
      firstInvalidEl.findFocusableParent();
    // "confirm"창울 띄우는 경우에 포커싱이 안되는 현상 때문에 "requestAnimationFrame"이 필요함.
    if (focusableElement) {
      requestAnimationFrame(() => {
        focusableElement.focus();
      });
    }

    this.#sdToast.info(errorMessage);
    this.invalid.emit();
  }

  onInvalidCapture() {
    this.invalid.emit();
  }
}
