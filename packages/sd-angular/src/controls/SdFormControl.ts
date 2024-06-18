import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, inject, Output, ViewChild} from "@angular/core";
import {SdToastProvider} from "../providers/SdToastProvider";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <form #formEl (submit)="onSubmit($event)">
      <ng-content/>
    </form>`
})
export class SdFormControl {
  #sdToast = inject(SdToastProvider);

  @ViewChild("formEl") formElRef!: ElementRef<HTMLFormElement>;

  @Output() submit = new EventEmitter();

  requestSubmit() {
    this.formElRef.nativeElement.requestSubmit();
  };

  onSubmit(event: SubmitEvent) {
    event.preventDefault();
    event.stopPropagation();

    const firstInvalidEl = this.formElRef.nativeElement.findFirst<HTMLElement>("*:invalid, *[sd-invalid]");

    if (!firstInvalidEl) {
      this.submit.emit();
      return;
    }

    const sdInvalidMessage = firstInvalidEl.getAttribute("sd-invalid");
    const invalidMessage = "validationMessage" in firstInvalidEl ? firstInvalidEl.validationMessage : "";

    const errorMessage = [sdInvalidMessage, invalidMessage].filterExists().join("\n");

    const focusableElement = (firstInvalidEl.isFocusable() ? firstInvalidEl : firstInvalidEl.findFocusableAll().first())
      ?? firstInvalidEl.findFocusableParent();
    // "confirm"창울 띄우는 경우에 포커싱이 안되는 현상 때문에 "requestAnimationFrame"이 필요함.
    if (focusableElement) {
      requestAnimationFrame(() => {
        focusableElement.focus();
      });
    }

    this.#sdToast.info(errorMessage);
  }
}