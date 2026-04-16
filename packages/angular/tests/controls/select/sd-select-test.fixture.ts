import { Component, signal } from "@angular/core";
import { SdSelect } from "../../../src/controls/select/sd-select";
import { SdSelectItem } from "../../../src/controls/select/sd-select-item";
import { SdForm } from "../../../src/controls/form/sd-form";
import { SdItemOfTemplate } from "../../../src/core/template/sd-item-of-template";
import { SdSelectButton } from "../../../src/controls/select/sd-select-button";

@Component({
  selector: "sd-select-single-test",
  template: `
    <sd-select [(value)]="value">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
      <sd-select-item [value]="'C'">Item C</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectSingleTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-preselected-test",
  template: `
    <sd-select [(value)]="value">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
      <sd-select-item [value]="'C'">Item C</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectPreselectedTest {
  value = signal<string | undefined>("A");
}

@Component({
  selector: "sd-select-placeholder-test",
  template: `
    <sd-select [(value)]="value" [placeholder]="'Select an item'">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectPlaceholderTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-multi-test",
  template: `
    <sd-select [(value)]="value" [selectMode]="'multi'">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
      <sd-select-item [value]="'C'">Item C</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectMultiTest {
  value = signal<string[]>([]);
}

@Component({
  selector: "sd-select-multi-preselected-test",
  template: `
    <sd-select [(value)]="value" [selectMode]="'multi'">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
      <sd-select-item [value]="'C'">Item C</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectMultiPreselectedTest {
  value = signal<string[]>(["A", "B"]);
}

@Component({
  selector: "sd-select-multi-hide-select-all-test",
  template: `
    <sd-select [(value)]="value" [selectMode]="'multi'" [hideSelectAll]="true">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectMultiHideSelectAllTest {
  value = signal<string[]>([]);
}

@Component({
  selector: "sd-select-multi-vertical-test",
  template: `
    <sd-select [(value)]="value" [selectMode]="'multi'" [multiSelectionDisplayDirection]="'vertical'">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectMultiVerticalTest {
  value = signal<string[]>(["A", "B"]);
}

@Component({
  selector: "sd-select-disabled-item-test",
  template: `
    <sd-select [(value)]="value">
      <sd-select-item [value]="'A'" [disabled]="true">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectDisabledItemTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-hidden-item-test",
  template: `
    <sd-select [(value)]="value">
      <sd-select-item [value]="'A'" [hidden]="true">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectHiddenItemTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-multi-mixed-state-test",
  template: `
    <sd-select [(value)]="value" [selectMode]="'multi'">
      <sd-select-item [value]="'A'" [disabled]="true">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
      <sd-select-item [value]="'C'" [hidden]="true">Item C</sd-select-item>
      <sd-select-item [value]="'D'">Item D</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectMultiMixedStateTest {
  value = signal<string[]>([]);
}

@Component({
  selector: "sd-select-required-test",
  template: `
    <sd-form>
      <sd-select [(value)]="value" [required]="true">
        <sd-select-item [value]="'A'">Item A</sd-select-item>
      </sd-select>
    </sd-form>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem, SdForm],
})
export class SdSelectRequiredTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-required-selected-test",
  template: `
    <sd-form>
      <sd-select [(value)]="value" [required]="true">
        <sd-select-item [value]="'A'">Item A</sd-select-item>
      </sd-select>
    </sd-form>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem, SdForm],
})
export class SdSelectRequiredSelectedTest {
  value = signal<string | undefined>("A");
}

@Component({
  selector: "sd-select-items-template-test",
  template: `
    <sd-select [(value)]="value" [items]="items">
      <ng-template [itemOf]="items" let-item>
        <sd-select-item [value]="item.value">{{ item.label }}</sd-select-item>
      </ng-template>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem, SdItemOfTemplate],
})
export class SdSelectItemsTemplateTest {
  value = signal<string | undefined>(undefined);
  items = [
    { value: "A", label: "Label A" },
    { value: "B", label: "Label B" },
    { value: "C", label: "Label C" },
  ];
}

@Component({
  selector: "sd-select-track-by-fn-test",
  template: `
    <sd-select [(value)]="value" [items]="items" [trackByFn]="trackByFn">
      <ng-template [itemOf]="items" let-item>
        <sd-select-item [value]="item.value">{{ item.label }}</sd-select-item>
      </ng-template>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem, SdItemOfTemplate],
})
export class SdSelectTrackByFnTest {
  value = signal<string | undefined>(undefined);
  items = [
    { value: "A", label: "Label A" },
    { value: "B", label: "Label B" },
  ];
  trackByFn = (item: { value: string; label: string }) => item.value;
}

interface TreeItem {
  value: string;
  label: string;
  children?: TreeItem[];
}

@Component({
  selector: "sd-select-hierarchy-test",
  template: `
    <sd-select [(value)]="value" [items]="items" [getChildrenFn]="getChildren">
      <ng-template [itemOf]="items" let-item let-depth="depth">
        <sd-select-item [value]="item.value" [style.padding-left.em]="depth * 1.5">
          {{ item.label }}
        </sd-select-item>
      </ng-template>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem, SdItemOfTemplate],
})
export class SdSelectHierarchyTest {
  value = signal<string | undefined>(undefined);
  items: TreeItem[] = [
    {
      value: "A",
      label: "Parent A",
      children: [
        { value: "A-1", label: "Child A-1" },
        { value: "A-2", label: "Child A-2" },
      ],
    },
  ];
  getChildren = (item: TreeItem) => item.children;
}

@Component({
  selector: "sd-select-header-tpl-test",
  template: `
    <sd-select [(value)]="value">
      <ng-template #headerTpl>
        <div class="custom-header">Header Content</div>
      </ng-template>
      <sd-select-item [value]="'A'">Item A</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectHeaderTplTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-before-tpl-test",
  template: `
    <sd-select [(value)]="value">
      <ng-template #beforeTpl>
        <div class="custom-before">Before Content</div>
      </ng-template>
      <sd-select-item [value]="'A'">Item A</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectBeforeTplTest {
  value = signal<string | undefined>(undefined);
}

// Slice 4 fixtures

@Component({
  selector: "sd-select-button-test",
  template: `
    <sd-select [(value)]="value">
      <sd-select-button (click)="onButtonClick()">Open</sd-select-button>
      <sd-select-item [value]="'A'">Item A</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem, SdSelectButton],
})
export class SdSelectButtonTest {
  value = signal<string | undefined>(undefined);
  onButtonClick() {}
}

@Component({
  selector: "sd-select-button-disabled-test",
  template: `
    <sd-select [(value)]="value" [disabled]="true">
      <sd-select-button>Open</sd-select-button>
      <sd-select-item [value]="'A'">Item A</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem, SdSelectButton],
})
export class SdSelectButtonDisabledTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-size-sm-test",
  template: `
    <sd-select [(value)]="value" [size]="'sm'">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectSizeSmTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-size-lg-test",
  template: `
    <sd-select [(value)]="value" [size]="'lg'">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectSizeLgTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-inline-test",
  template: `
    <sd-select [(value)]="value" [inline]="true">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectInlineTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-inset-test",
  template: `
    <sd-select [(value)]="value" [inset]="true">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectInsetTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-disabled-test",
  template: `
    <sd-select [(value)]="value" [disabled]="true">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectDisabledTest {
  value = signal<string | undefined>(undefined);
}

// Slice 5 fixtures

@Component({
  selector: "sd-select-dynamic-content-test",
  template: `
    <sd-select [(value)]="value">
      <sd-select-item [value]="'A'">{{ labelA() }}</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectDynamicContentTest {
  value = signal<string | undefined>("A");
  labelA = signal("Item A");
}

@Component({
  selector: "sd-select-keyboard-test",
  template: `
    <sd-select [(value)]="value">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
      <sd-select-item [value]="'C'">Item C</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectKeyboardTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-select-keyboard-multi-test",
  template: `
    <sd-select [(value)]="value" [selectMode]="'multi'">
      <sd-select-item [value]="'A'">Item A</sd-select-item>
      <sd-select-item [value]="'B'">Item B</sd-select-item>
    </sd-select>
  `,
  standalone: true,
  imports: [SdSelect, SdSelectItem],
})
export class SdSelectKeyboardMultiTest {
  value = signal<string[]>([]);
}
