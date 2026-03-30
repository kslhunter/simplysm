import { Component, signal } from "@angular/core";
import { SdTabviewControl } from "../../../../src/ui/navigation/tab/sd-tabview.control";
import { SdTabviewItemControl } from "../../../../src/ui/navigation/tab/sd-tabview-item.control";

@Component({
  selector: "sd-tabview-basic-test",
  template: `
    <sd-tabview [(value)]="value">
      <sd-tabview-item [value]="'A'">Content A</sd-tabview-item>
      <sd-tabview-item [value]="'B'">Content B</sd-tabview-item>
    </sd-tabview>
  `,
  standalone: true,
  imports: [SdTabviewControl, SdTabviewItemControl],
})
export class SdTabviewBasicTest {
  value = signal<string>("A");
}

@Component({
  selector: "sd-tabview-header-test",
  template: `
    <sd-tabview [(value)]="value">
      <sd-tabview-item [value]="'settings'" [header]="'설정'">Settings Content</sd-tabview-item>
      <sd-tabview-item [value]="'profile'">Profile Content</sd-tabview-item>
    </sd-tabview>
  `,
  standalone: true,
  imports: [SdTabviewControl, SdTabviewItemControl],
})
export class SdTabviewHeaderTest {
  value = signal<string>("settings");
}

@Component({
  selector: "sd-tabview-external-value-test",
  template: `
    <sd-tabview [(value)]="value">
      <sd-tabview-item [value]="'A'">Content A</sd-tabview-item>
      <sd-tabview-item [value]="'B'">Content B</sd-tabview-item>
    </sd-tabview>
  `,
  standalone: true,
  imports: [SdTabviewControl, SdTabviewItemControl],
})
export class SdTabviewExternalValueTest {
  value = signal<string>("A");
}
