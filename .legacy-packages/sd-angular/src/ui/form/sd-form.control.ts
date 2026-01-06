import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  output,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-form",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <form #formEl novalidate (submit)="handleSubmit($event)">
      <ng-content />
      <button hidden type="submit"></button>
    </form>
  `,
})
export class SdFormControl {
  formElRef = viewChild.required<any, ElementRef<HTMLFormElement>>("formEl", {
    read: ElementRef,
  });

  get formEl() {
    return this.formElRef().nativeElement;
  }

  submit = output<SubmitEvent>();
  invalid = output();

  requestSubmit() {
    this.formEl.requestSubmit();
  }

  handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.formEl.checkValidity()) {
      this.submit.emit(event);
      return;
    }

    // 자동 메시지 및 포커싱
    this.formEl.reportValidity();
    this.invalid.emit();
  }
}
