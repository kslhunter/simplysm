import { Component, signal } from "@angular/core";
import { SdFormControl } from "../../../src/ui/form/sd-form.control";

@Component({
  selector: "sd-form-valid-test",
  template: `
    <sd-form (formSubmit)="submitted.set(true)" (formInvalid)="invalidated.set(true)">
      <input type="text" value="valid" />
    </sd-form>
  `,
  standalone: true,
  imports: [SdFormControl],
})
export class SdFormValidTest {
  submitted = signal(false);
  invalidated = signal(false);
}

@Component({
  selector: "sd-form-invalid-test",
  template: `
    <sd-form (formSubmit)="submitted.set(true)" (formInvalid)="invalidated.set(true)">
      <input type="text" required />
    </sd-form>
  `,
  standalone: true,
  imports: [SdFormControl],
})
export class SdFormInvalidTest {
  submitted = signal(false);
  invalidated = signal(false);
}

@Component({
  selector: "sd-form-request-submit-test",
  template: `
    <sd-form (formSubmit)="submitted.set(true)">
      <input type="text" value="ok" />
    </sd-form>
  `,
  standalone: true,
  imports: [SdFormControl],
})
export class SdFormRequestSubmitTest {
  submitted = signal(false);
}
