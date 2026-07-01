import { Component, signal } from "@angular/core";
import { DateOnly, DateTime, Time } from "@simplysm/core-common";
import { SdTextfield } from "../../../src/controls/input/sd-textfield";

// region Slice 1: String types + basic

@Component({
  selector: "sd-textfield-text-test",
  template: `<sd-textfield [type]="'text'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldTextTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-password-test",
  template: `<sd-textfield [type]="'password'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldPasswordTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-email-test",
  template: `<sd-textfield [type]="'email'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldEmailTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-color-test",
  template: `<sd-textfield [type]="'color'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldColorTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-disabled-test",
  template: `<sd-textfield [type]="'text'" [(value)]="value" [disabled]="true" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldDisabledTest {
  value = signal<string | undefined>("disabled value");
}

@Component({
  selector: "sd-textfield-readonly-test",
  template: `<sd-textfield [type]="'text'" [(value)]="value" [readonly]="true" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldReadonlyTest {
  value = signal<string | undefined>("readonly value");
}

@Component({
  selector: "sd-textfield-required-test",
  template: `<sd-textfield
    [type]="'text'"
    [(value)]="value"
    [required]="true"
    [disabled]="disabled()"
    [readonly]="readonly()"
  />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldRequiredTest {
  value = signal<string | undefined>(undefined);
  disabled = signal(false);
  readonly = signal(false);
}

@Component({
  selector: "sd-textfield-inline-test",
  template: `<sd-textfield [type]="'text'" [inline]="true" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldInlineTest {}

@Component({
  selector: "sd-textfield-placeholder-test",
  template: `<sd-textfield [type]="'text'" [placeholder]="'입력하세요'" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldPlaceholderTest {}

@Component({
  selector: "sd-textfield-title-test",
  template: `<sd-textfield [type]="'text'" [title]="'필드 설명'" [placeholder]="'입력하세요'" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldTitleTest {}

@Component({
  selector: "sd-textfield-title-fallback-test",
  template: `<sd-textfield [type]="'text'" [placeholder]="'입력하세요'" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldTitleFallbackTest {}

// endregion

// region Slice 2: Number + Format types

@Component({
  selector: "sd-textfield-number-test",
  template: `<sd-textfield [type]="'number'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldNumberTest {
  value = signal<number | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-number-no-comma-test",
  template: `<sd-textfield [type]="'number'" [(value)]="value" [useNumberComma]="false" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldNumberNoCommaTest {
  value = signal<number | undefined>(1234);
}

@Component({
  selector: "sd-textfield-number-min-digits-test",
  template: `<sd-textfield [type]="'number'" [(value)]="value" [minDigits]="2" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldNumberMinDigitsTest {
  value = signal<number | undefined>(1);
}

@Component({
  selector: "sd-textfield-format-test",
  template: `<sd-textfield [type]="'format'" [(value)]="value" [format]="'XXX-XXXX'" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldFormatTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-format-multi-test",
  template: `<sd-textfield [type]="'format'" [(value)]="value" [format]="'XXX-XXXX|XX-XXXX-XXXX'" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldFormatMultiTest {
  value = signal<string | undefined>("0101234567");
}

// endregion

// region Slice 3: DateOnly + DateTime + Time types

@Component({
  selector: "sd-textfield-date-test",
  template: `<sd-textfield [type]="'date'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldDateTest {
  value = signal<DateOnly | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-month-test",
  template: `<sd-textfield [type]="'month'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldMonthTest {
  value = signal<DateOnly | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-year-test",
  template: `<sd-textfield [type]="'year'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldYearTest {
  value = signal<DateOnly | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-datetime-test",
  template: `<sd-textfield [type]="'datetime'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldDatetimeTest {
  value = signal<DateTime | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-datetime-sec-test",
  template: `<sd-textfield [type]="'datetime-sec'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldDatetimeSecTest {
  value = signal<DateTime | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-time-test",
  template: `<sd-textfield [type]="'time'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldTimeTest {
  value = signal<Time | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-time-sec-test",
  template: `<sd-textfield [type]="'time-sec'" [(value)]="value" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldTimeSecTest {
  value = signal<Time | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-datetime-readonly-test",
  template: `<sd-textfield [type]="'datetime'" [(value)]="value" [readonly]="true" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldDatetimeReadonlyTest {
  value = signal<DateTime | undefined>(undefined);
}

// endregion

// region Slice 4: Visual variants

@Component({
  selector: "sd-textfield-inset-test",
  template: `<sd-textfield [type]="'text'" [(value)]="value" [inset]="true" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldInsetTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-theme-test",
  template: `<sd-textfield [type]="'text'" [(value)]="value" [theme]="'primary'" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldThemeTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-textfield-size-test",
  template: `<sd-textfield [type]="'text'" [(value)]="value" [size]="'sm'" />`,
  standalone: true,
  imports: [SdTextfield],
})
export class SdTextfieldSizeTest {
  value = signal<string | undefined>(undefined);
}

// endregion
