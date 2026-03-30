import { Component, signal } from "@angular/core";
import { SdSwitchControl } from "../../../../src/ui/form/checkbox/sd-switch.control";

@Component({
  selector: "sd-switch-default-test",
  template: `<sd-switch [(value)]="value" />`,
  standalone: true,
  imports: [SdSwitchControl],
})
export class SdSwitchDefaultTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-on-test",
  template: `<sd-switch [(value)]="value" />`,
  standalone: true,
  imports: [SdSwitchControl],
})
export class SdSwitchOnTest {
  value = signal(true);
}

@Component({
  selector: "sd-switch-disabled-test",
  template: `<sd-switch [(value)]="value" [disabled]="true" />`,
  standalone: true,
  imports: [SdSwitchControl],
})
export class SdSwitchDisabledTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-theme-test",
  template: `<sd-switch [(value)]="value" [theme]="'primary'" />`,
  standalone: true,
  imports: [SdSwitchControl],
})
export class SdSwitchThemeTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-inline-test",
  template: `<sd-switch [(value)]="value" [inline]="true" />`,
  standalone: true,
  imports: [SdSwitchControl],
})
export class SdSwitchInlineTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-inset-test",
  template: `<sd-switch [(value)]="value" [inset]="true" />`,
  standalone: true,
  imports: [SdSwitchControl],
})
export class SdSwitchInsetTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-size-sm-test",
  template: `<sd-switch [(value)]="value" [size]="'sm'" />`,
  standalone: true,
  imports: [SdSwitchControl],
})
export class SdSwitchSizeSmTest {
  value = signal(false);
}

@Component({
  selector: "sd-switch-propagation-test",
  template: `
    <div (click)="parentClicked = true" (keydown)="0" tabindex="0">
      <sd-switch [(value)]="value" />
    </div>
  `,
  standalone: true,
  imports: [SdSwitchControl],
})
export class SdSwitchPropagationTest {
  value = signal(false);
  parentClicked = false;
}
