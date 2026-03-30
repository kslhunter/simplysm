import { Component, signal } from "@angular/core";
import { SdTabControl } from "../../../../src/ui/navigation/tab/sd-tab.control";
import { SdTabItemControl } from "../../../../src/ui/navigation/tab/sd-tab-item.control";

@Component({
  selector: "sd-tab-click-test",
  template: `
    <sd-tab [(value)]="value">
      <sd-tab-item [value]="'A'">A</sd-tab-item>
      <sd-tab-item [value]="'B'">B</sd-tab-item>
    </sd-tab>
  `,
  standalone: true,
  imports: [SdTabControl, SdTabItemControl],
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
  imports: [SdTabControl, SdTabItemControl],
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
  imports: [SdTabControl, SdTabItemControl],
})
export class SdTabSelectedStyleTest {
  value = signal<string>("A");
}
