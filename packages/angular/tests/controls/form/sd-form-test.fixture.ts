import { Component, signal } from "@angular/core";
import { SdForm } from "../../../src/controls/form/sd-form";

@Component({
  selector: "sd-form-valid-test",
  template: `
    <sd-form (formSubmit)="submitted.set(true)" (formInvalid)="invalidated.set(true)">
      <input type="text" value="valid" />
    </sd-form>
  `,
  standalone: true,
  imports: [SdForm],
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
  imports: [SdForm],
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
  imports: [SdForm],
})
export class SdFormRequestSubmitTest {
  submitted = signal(false);
}
