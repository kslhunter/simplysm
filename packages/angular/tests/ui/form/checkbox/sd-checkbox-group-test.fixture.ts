import { Component, signal } from "@angular/core";
import { SdCheckboxGroup } from "../../../../src/ui/form/checkbox/sd-checkbox-group";
import { SdCheckboxGroupItem } from "../../../../src/ui/form/checkbox/sd-checkbox-group-item";

@Component({
  selector: "sd-checkbox-group-default-test",
  template: `
    <sd-checkbox-group [(value)]="value">
      <sd-checkbox-group-item [value]="'A'">A</sd-checkbox-group-item>
      <sd-checkbox-group-item [value]="'B'">B</sd-checkbox-group-item>
      <sd-checkbox-group-item [value]="'C'">C</sd-checkbox-group-item>
    </sd-checkbox-group>
  `,
  standalone: true,
  imports: [SdCheckboxGroup, SdCheckboxGroupItem],
})
export class SdCheckboxGroupDefaultTest {
  value = signal<string[]>([]);
}

@Component({
  selector: "sd-checkbox-group-preselected-test",
  template: `
    <sd-checkbox-group [(value)]="value">
      <sd-checkbox-group-item [value]="'A'">A</sd-checkbox-group-item>
      <sd-checkbox-group-item [value]="'B'">B</sd-checkbox-group-item>
    </sd-checkbox-group>
  `,
  standalone: true,
  imports: [SdCheckboxGroup, SdCheckboxGroupItem],
})
export class SdCheckboxGroupPreselectedTest {
  value = signal<string[]>(["A"]);
}

@Component({
  selector: "sd-checkbox-group-multi-test",
  template: `
    <sd-checkbox-group [(value)]="value">
      <sd-checkbox-group-item [value]="'A'">A</sd-checkbox-group-item>
      <sd-checkbox-group-item [value]="'B'">B</sd-checkbox-group-item>
    </sd-checkbox-group>
  `,
  standalone: true,
  imports: [SdCheckboxGroup, SdCheckboxGroupItem],
})
export class SdCheckboxGroupMultiTest {
  value = signal<string[]>(["A", "B"]);
}

@Component({
  selector: "sd-checkbox-group-disabled-test",
  template: `
    <sd-checkbox-group [(value)]="value" [disabled]="true">
      <sd-checkbox-group-item [value]="'A'">A</sd-checkbox-group-item>
      <sd-checkbox-group-item [value]="'B'">B</sd-checkbox-group-item>
    </sd-checkbox-group>
  `,
  standalone: true,
  imports: [SdCheckboxGroup, SdCheckboxGroupItem],
})
export class SdCheckboxGroupDisabledTest {
  value = signal<string[]>([]);
}
