import { Component, signal } from "@angular/core";
import { SdTab } from "../../../src/controls/tab/sd-tab";
import { SdTabItem } from "../../../src/controls/tab/sd-tab-item";

@Component({
  selector: "sd-tab-click-test",
  template: `
    <sd-tab [(value)]="value">
      <sd-tab-item [value]="'A'">A</sd-tab-item>
      <sd-tab-item [value]="'B'">B</sd-tab-item>
    </sd-tab>
  `,
  standalone: true,
  imports: [SdTab, SdTabItem],
})
export class SdTabClickTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-tab-reclick-test",
  template: `
    <sd-tab [(value)]="value">
      <sd-tab-item [value]="'A'">A</sd-tab-item>
      <sd-tab-item [value]="'B'">B</sd-tab-item>
    </sd-tab>
  `,
  standalone: true,
  imports: [SdTab, SdTabItem],
})
export class SdTabReclickTest {
  value = signal<string>("A");
}

@Component({
  selector: "sd-tab-selected-style-test",
  template: `
    <sd-tab [(value)]="value">
      <sd-tab-item [value]="'A'">A</sd-tab-item>
      <sd-tab-item [value]="'B'">B</sd-tab-item>
    </sd-tab>
  `,
  standalone: true,
  imports: [SdTab, SdTabItem],
})
export class SdTabSelectedStyleTest {
  value = signal<string>("A");
}
