import { Component, signal } from "@angular/core";
import { tablerCheck } from "@ng-icons/tabler-icons";
import { SdList } from "../../../src/controls/list/sd-list";
import { SdListItem } from "../../../src/controls/list/sd-list-item";

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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
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
  imports: [SdList, SdListItem],
})
export class SdListItemReadonlyTest {}

@Component({
  selector: "sd-list-item-flat-no-children-test",
  template: `
    <sd-list>
      <sd-list-item [layout]="'flat'">Flat Leaf</sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdList, SdListItem],
})
export class SdListItemFlatNoChildrenTest {}

@Component({
  selector: "sd-list-item-dynamic-icon-test",
  template: `
    <sd-list>
      <sd-list-item [selectedIcon]="icon()" [selected]="true">Item</sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdList, SdListItem],
})
export class SdListItemDynamicIconTest {
  icon = signal<string | undefined>(undefined);
  iconValue = tablerCheck;
}

@Component({
  selector: "sd-list-item-depth-test",
  template: `
    <sd-list>
      <sd-list-item [open]="true">
        Level 1
        <sd-list>
          <sd-list-item [open]="true">
            Level 2
            <sd-list>
              <sd-list-item>Level 3</sd-list-item>
            </sd-list>
          </sd-list-item>
        </sd-list>
      </sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdList, SdListItem],
})
export class SdListItemDepthTest {}

@Component({
  selector: "sd-list-item-flat-parent-depth-test",
  template: `
    <sd-list>
      <sd-list-item [layout]="'flat'">
        Flat Parent
        <sd-list>
          <sd-list-item>Child</sd-list-item>
        </sd-list>
      </sd-list-item>
    </sd-list>
  `,
  standalone: true,
  imports: [SdList, SdListItem],
})
export class SdListItemFlatParentDepthTest {}

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
  imports: [SdList, SdListItem],
})
export class SdListItemToolTest {}
