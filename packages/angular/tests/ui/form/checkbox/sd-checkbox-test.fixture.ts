import { Component, signal } from "@angular/core";
import { SdCheckboxControl } from "../../../../src/ui/form/checkbox/sd-checkbox.control";

@Component({
  selector: "sd-checkbox-default-test",
  template: `<sd-checkbox [(value)]="value">Label</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxDefaultTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-checked-test",
  template: `<sd-checkbox [(value)]="value">Checked</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxCheckedTest {
  value = signal(true);
}

@Component({
  selector: "sd-checkbox-radio-test",
  template: `<sd-checkbox [(value)]="value" [radio]="true">Radio</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxRadioTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-radio-checked-test",
  template: `<sd-checkbox [(value)]="value" [radio]="true">Radio Checked</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxRadioCheckedTest {
  value = signal(true);
}

@Component({
  selector: "sd-checkbox-disabled-test",
  template: `<sd-checkbox [(value)]="value" [disabled]="true">Disabled</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxDisabledTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-can-change-allow-test",
  template: `<sd-checkbox [(value)]="value" [canChangeFn]="canChange">Guarded</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxCanChangeAllowTest {
  value = signal(false);
  canChange = () => true;
}

@Component({
  selector: "sd-checkbox-can-change-deny-test",
  template: `<sd-checkbox [(value)]="value" [canChangeFn]="canChange">Guarded</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxCanChangeDenyTest {
  value = signal(false);
  canChange = () => false;
}

@Component({
  selector: "sd-checkbox-theme-test",
  template: `<sd-checkbox [(value)]="value" [theme]="'primary'">Themed</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxThemeTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-size-sm-test",
  template: `<sd-checkbox [(value)]="value" [size]="'sm'">Small</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxSizeSmTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-inline-test",
  template: `<sd-checkbox [(value)]="value" [inline]="true">Inline</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxInlineTest {
  value = signal(false);
}

@Component({
  selector: "sd-checkbox-inset-test",
  template: `<sd-checkbox [(value)]="value" [inset]="true">Inset</sd-checkbox>`,
  standalone: true,
  imports: [SdCheckboxControl],
})
export class SdCheckboxInsetTest {
  value = signal(false);
}
