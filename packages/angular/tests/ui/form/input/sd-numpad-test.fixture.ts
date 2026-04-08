import { Component, signal } from "@angular/core";
import { SdNumpad } from "../../../../src/ui/form/input/sd-numpad";

@Component({
  selector: "sd-numpad-default-test",
  template: `<sd-numpad [(value)]="value" />`,
  standalone: true,
  imports: [SdNumpad],
})
export class SdNumpadDefaultTest {
  value = signal<number | undefined>(undefined);
}

@Component({
  selector: "sd-numpad-with-text-test",
  template: `<sd-numpad [(value)]="value" />`,
  standalone: true,
  imports: [SdNumpad],
})
export class SdNumpadWithTextTest {
  value = signal<number | undefined>(undefined);
}

@Component({
  selector: "sd-numpad-minus-test",
  template: `<sd-numpad [(value)]="value" [useMinusButton]="true" />`,
  standalone: true,
  imports: [SdNumpad],
})
export class SdNumpadMinusTest {
  value = signal<number | undefined>(undefined);
}

@Component({
  selector: "sd-numpad-enter-test",
  template: `
    <sd-numpad
      [(value)]="value"
      [useEnterButton]="true"
      (enterButtonClick)="enterClicked = true"
    />
  `,
  standalone: true,
  imports: [SdNumpad],
})
export class SdNumpadEnterTest {
  value = signal<number | undefined>(undefined);
  enterClicked = false;
}

@Component({
  selector: "sd-numpad-enter-required-test",
  template: `<sd-numpad [(value)]="value" [useEnterButton]="true" [required]="true" />`,
  standalone: true,
  imports: [SdNumpad],
})
export class SdNumpadEnterRequiredTest {
  value = signal<number | undefined>(undefined);
}

@Component({
  selector: "sd-numpad-input-disabled-test",
  template: `<sd-numpad [(value)]="value" [inputDisabled]="true" />`,
  standalone: true,
  imports: [SdNumpad],
})
export class SdNumpadInputDisabledTest {
  value = signal<number | undefined>(undefined);
}

@Component({
  selector: "sd-numpad-no-minus-test",
  template: `<sd-numpad [(value)]="value" />`,
  standalone: true,
  imports: [SdNumpad],
})
export class SdNumpadNoMinusTest {
  value = signal<number | undefined>(undefined);
}

@Component({
  selector: "sd-numpad-no-enter-test",
  template: `<sd-numpad [(value)]="value" />`,
  standalone: true,
  imports: [SdNumpad],
})
export class SdNumpadNoEnterTest {
  value = signal<number | undefined>(undefined);
}
