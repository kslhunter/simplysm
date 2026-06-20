import { Component, signal, viewChild } from "@angular/core";
import { SdMarkdownEditor } from "../../../src";

@Component({
  selector: "sd-markdown-editor-default-test",
  template: `<sd-markdown-editor [(value)]="value" />`,
  standalone: true,
  imports: [SdMarkdownEditor],
})
export class SdMarkdownEditorDefaultTest {
  value = signal<string | undefined>(undefined);
  editorCtrl = viewChild(SdMarkdownEditor);
}

@Component({
  selector: "sd-markdown-editor-initial-value-test",
  template: `<sd-markdown-editor [(value)]="value" />`,
  standalone: true,
  imports: [SdMarkdownEditor],
})
export class SdMarkdownEditorInitialValueTest {
  value = signal<string | undefined>("# Hello");
  editorCtrl = viewChild(SdMarkdownEditor);
}

@Component({
  selector: "sd-markdown-editor-disabled-test",
  template: `<sd-markdown-editor [(value)]="value" [disabled]="disabled()" />`,
  standalone: true,
  imports: [SdMarkdownEditor],
})
export class SdMarkdownEditorDisabledTest {
  value = signal<string | undefined>("# Hello");
  disabled = signal(false);
  editorCtrl = viewChild(SdMarkdownEditor);
}

@Component({
  selector: "sd-markdown-editor-readonly-test",
  template: `<sd-markdown-editor [(value)]="value" [readonly]="readonly()" />`,
  standalone: true,
  imports: [SdMarkdownEditor],
})
export class SdMarkdownEditorReadonlyTest {
  value = signal<string | undefined>("# Hello");
  readonly = signal(false);
  editorCtrl = viewChild(SdMarkdownEditor);
}

@Component({
  selector: "sd-markdown-editor-placeholder-test",
  template: `<sd-markdown-editor [(value)]="value" [placeholder]="'내용을 입력하세요'" />`,
  standalone: true,
  imports: [SdMarkdownEditor],
})
export class SdMarkdownEditorPlaceholderTest {
  value = signal<string | undefined>(undefined);
  editorCtrl = viewChild(SdMarkdownEditor);
}

@Component({
  selector: "sd-markdown-editor-required-test",
  template: `<form><sd-markdown-editor [(value)]="value" [required]="true" /></form>`,
  standalone: true,
  imports: [SdMarkdownEditor],
})
export class SdMarkdownEditorRequiredTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-markdown-editor-validator-test",
  template: `<form><sd-markdown-editor [(value)]="value" [validatorFn]="validator" /></form>`,
  standalone: true,
  imports: [SdMarkdownEditor],
})
export class SdMarkdownEditorValidatorTest {
  value = signal<string | undefined>("short");
  validator = (val: string | undefined): string | undefined => {
    if (val != null && val.length < 20) return "내용이 너무 짧습니다.";
    return undefined;
  };
}
