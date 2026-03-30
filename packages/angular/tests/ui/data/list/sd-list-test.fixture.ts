import { Component, signal } from "@angular/core";
import { tablerCheck } from "@ng-icons/tabler-icons";
import { SdListControl } from "../../../../src/ui/data/list/sd-list.control";
import { SdListItemControl } from "../../../../src/ui/data/list/sd-list-item.control";

// --- sd-list basic fixtures ---

@Component({
  selector: "sd-list-default-test",
  template: `
    <sd-list>
      <sd-list-item>Item 1</sd-list-item>
      <sd-list-item>Item 2</sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListDefaultTest {}

@Component({
  selector: "sd-list-inset-test",
  template: `
    <sd-list [inset]="true">
      <sd-list-item>Item 1</sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListInsetTest {}

@Component({
  selector: "sd-list-nested-test",
  template: `
    <sd-list>
      <sd-list-item>
        Parent
        <sd-list>
          <sd-list-item>Child</sd-list-item>
        </sd-list>
      </sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListNestedTest {}

// --- sd-list-item layout fixtures ---

@Component({
  selector: "sd-list-item-accordion-test",
  template: `
    <sd-list>
      <sd-list-item [(open)]="open">
        Accordion Parent
        <sd-list>
          <sd-list-item>Child 1</sd-list-item>
        </sd-list>
      </sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListItemAccordionTest {
  open = signal(false);
}

@Component({
  selector: "sd-list-item-accordion-open-test",
  template: `
    <sd-list>
      <sd-list-item [open]="true">
        Accordion Parent
        <sd-list>
          <sd-list-item>Child 1</sd-list-item>
        </sd-list>
      </sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListItemAccordionOpenTest {}

@Component({
  selector: "sd-list-item-flat-test",
  template: `
    <sd-list>
      <sd-list-item [layout]="'flat'">
        Flat Parent
        <sd-list>
          <sd-list-item>Child 1</sd-list-item>
        </sd-list>
      </sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListItemFlatTest {}

@Component({
  selector: "sd-list-item-no-children-test",
  template: `
    <sd-list>
      <sd-list-item>Leaf Item</sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListItemNoChildrenTest {}

// --- sd-list-item selection/readonly fixtures ---

@Component({
  selector: "sd-list-item-selected-test",
  template: `
    <sd-list>
      <sd-list-item [selected]="true">Selected Item</sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListItemSelectedTest {}

@Component({
  selector: "sd-list-item-selected-icon-test",
  template: `
    <sd-list>
      <sd-list-item [selected]="true" [selectedIcon]="icons.tablerCheck">Selected</sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListItemSelectedIconTest {
  icons = { tablerCheck };
}

@Component({
  selector: "sd-list-item-unselected-icon-test",
  template: `
    <sd-list>
      <sd-list-item [selected]="false" [selectedIcon]="icons.tablerCheck">Unselected</sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListItemUnselectedIconTest {
  icons = { tablerCheck };
}

@Component({
  selector: "sd-list-item-readonly-test",
  template: `
    <sd-list>
      <sd-list-item [readonly]="true">Readonly Item</sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListItemReadonlyTest {}

@Component({
  selector: "sd-list-item-tool-test",
  template: `
    <sd-list>
      <sd-list-item>
        Item Content
        <ng-template #toolTpl>
          <button class="tool-btn">Tool</button>
        </ng-template>
      </sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdListControl, SdListItemControl],
})
export class SdListItemToolTest {}
