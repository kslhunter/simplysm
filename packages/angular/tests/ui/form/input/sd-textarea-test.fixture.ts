import { Component, signal } from "@angular/core";
import { SdTextareaControl } from "../../../../src/ui/form/input/sd-textarea.control";

// region Slice 1: Value binding + rows

@Component({
  selector: "sd-textarea-default-test",
  template: `<sd-textarea [(value)]="value" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaDefaultTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textarea-min-rows-test",
  template: `<sd-textarea [(value)]="value" [minRows]="minRows()" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaMinRowsTest {
  value = signal<string | undefined>(undefined);
  minRows = signal(1);
}

@Component({
  selector: "sd-textarea-required-test",
  template: `<sd-textarea [(value)]="value" [required]="true" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaRequiredTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textarea-validator-test",
  template: `<sd-textarea [(value)]="value" [validatorFn]="validator" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaValidatorTest {
  value = signal<string | undefined>("abc");
  validator = (v: string | undefined): string | undefined =>
    v !== undefined && v.length < 10 ? "10자 이상 입력하세요" : undefined;
}

@Component({
  selector: "sd-textarea-required-validator-test",
  template: `<sd-textarea [(value)]="value" [required]="true" [validatorFn]="validator" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaRequiredValidatorTest {
  value = signal<string | undefined>(undefined);
  validator = (): string | undefined => "커스텀 에러";
}

@Component({
  selector: "sd-textarea-disabled-test",
  template: `<sd-textarea [(value)]="value" [disabled]="true" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaDisabledTest {
  value = signal<string | undefined>("내용");
}

@Component({
  selector: "sd-textarea-readonly-test",
  template: `<sd-textarea [(value)]="value" [readonly]="true" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaReadonlyTest {
  value = signal<string | undefined>("내용");
}

@Component({
  selector: "sd-textarea-placeholder-test",
  template: `<sd-textarea [(value)]="value" [placeholder]="'입력하세요'" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaPlaceholderTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textarea-disabled-placeholder-test",
  template: `<sd-textarea [(value)]="value" [disabled]="true" [placeholder]="'입력하세요'" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaDisabledPlaceholderTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textarea-disabled-empty-test",
  template: `<sd-textarea [(value)]="value" [disabled]="true" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaDisabledEmptyTest {
  value = signal<string | undefined>(undefined);
}

// endregion

// region Slice 1: Visual variants

@Component({
  selector: "sd-textarea-inline-test",
  template: `<sd-textarea [inline]="true" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaInlineTest {}

@Component({
  selector: "sd-textarea-inset-test",
  template: `<sd-textarea [(value)]="value" [inset]="true" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaInsetTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textarea-size-test",
  template: `<sd-textarea [(value)]="value" [size]="'sm'" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaSizeTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textarea-theme-test",
  template: `<sd-textarea [(value)]="value" [theme]="'primary'" />`,
  standalone: true,
  imports: [SdTextareaControl],
})
export class SdTextareaThemeTest {
  value = signal<string | undefined>(undefined);
}

// endregion
