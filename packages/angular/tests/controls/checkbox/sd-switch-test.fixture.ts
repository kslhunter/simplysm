import { Component, signal } from "@angular/core";
import { SdSwitch } from "../../../src/controls/checkbox/sd-switch";

@Component({
  selector: "sd-switch-default-test",
  template: `<sd-switch [(value)]="value" />`,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchDefaultTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-on-test",
  template: `<sd-switch [(value)]="value" />`,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchOnTest {
  value = signal(true);
}

@Component({
  selector: "sd-switch-disabled-test",
  template: `<sd-switch [(value)]="value" [disabled]="true" />`,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchDisabledTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-theme-test",
  template: `<sd-switch [(value)]="value" [theme]="'primary'" />`,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchThemeTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-inline-test",
  template: `<sd-switch [(value)]="value" [inline]="true" />`,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchInlineTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-inset-test",
  template: `<sd-switch [(value)]="value" [inset]="true" />`,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchInsetTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-size-sm-test",
  template: `<sd-switch [(value)]="value" [size]="'sm'" />`,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchSizeSmTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-can-change-allow-test",
  template: `<sd-switch [(value)]="value" [canChangeFn]="canChange" />`,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchCanChangeAllowTest {
  value = signal(false);
  canChange = () => true;
}

@Component({
  selector: "sd-switch-can-change-deny-test",
  template: `<sd-switch [(value)]="value" [canChangeFn]="canChange" />`,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchCanChangeDenyTest {
  value = signal(false);
  canChange = () => false;
}

@Component({
  selector: "sd-switch-propagation-test",
  template: `
    <div (click)="parentClicked = true" (keydown)="0" tabindex="0">
      <sd-switch [(value)]="value" />
    </div>
  `,
  standalone: true,
  imports: [SdSwitch],
})
export class SdSwitchPropagationTest {
  value = signal(false);
  parentClicked = false;
}
