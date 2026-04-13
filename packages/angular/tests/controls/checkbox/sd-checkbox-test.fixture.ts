import { Component, signal } from "@angular/core";
import { SdCheckbox } from "../../../src/controls/checkbox/sd-checkbox";

@Component({
  selector: "sd-checkbox-default-test",
  template: `<sd-checkbox [(value)]="value">Label</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxDefaultTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-checked-test",
  template: `<sd-checkbox [(value)]="value">Checked</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxCheckedTest {
  value = signal(true);
}

@Component({
  selector: "sd-checkbox-radio-test",
  template: `<sd-checkbox [(value)]="value" [radio]="true">Radio</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxRadioTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-radio-checked-test",
  template: `<sd-checkbox [(value)]="value" [radio]="true">Radio Checked</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxRadioCheckedTest {
  value = signal(true);
}

@Component({
  selector: "sd-checkbox-disabled-test",
  template: `<sd-checkbox [(value)]="value" [disabled]="true">Disabled</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxDisabledTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-can-change-allow-test",
  template: `<sd-checkbox [(value)]="value" [canChangeFn]="canChange">Guarded</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxCanChangeAllowTest {
  value = signal(false);
  canChange = () => true;
}

@Component({
  selector: "sd-checkbox-can-change-deny-test",
  template: `<sd-checkbox [(value)]="value" [canChangeFn]="canChange">Guarded</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxCanChangeDenyTest {
  value = signal(false);
  canChange = () => false;
}

@Component({
  selector: "sd-checkbox-propagation-test",
  template: `
    <div (click)="parentClicked = true" (keydown)="0" tabindex="0">
      <sd-checkbox [(value)]="value">Label</sd-checkbox>
    </div>
  `,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxPropagationTest {
  value = signal(false);
  parentClicked = false;
}

@Component({
  selector: "sd-checkbox-theme-test",
  template: `<sd-checkbox [(value)]="value" [theme]="'primary'">Themed</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxThemeTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-size-sm-test",
  template: `<sd-checkbox [(value)]="value" [size]="'sm'">Small</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxSizeSmTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-inline-test",
  template: `<sd-checkbox [(value)]="value" [inline]="true">Inline</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxInlineTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-inset-test",
  template: `<sd-checkbox [(value)]="value" [inset]="true">Inset</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckbox],
})
export class SdCheckboxInsetTest {
  value = signal(false);
}
