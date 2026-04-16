import { Component, signal, viewChild } from "@angular/core";
import { SdTiptapEditor } from "../../../src/features/editor/sd-tiptap-editor";
import type { AnyExtension } from "@tiptap/core";

// Slice 1: 에디터 코어 + 양방향 바인딩

@Component({
  selector: "sd-tiptap-editor-default-test",
  template: `<sd-tiptap-editor [(value)]="value" />`,
  standalone: true,
  imports: [SdTiptapEditor],
})
export class SdTiptapEditorDefaultTest {
  value = signal<string | undefined>(undefined);
  editorCtrl = viewChild(SdTiptapEditor);
}

@Component({
  selector: "sd-tiptap-editor-initial-value-test",
  template: `<sd-tiptap-editor [(value)]="value" />`,
  standalone: true,
  imports: [SdTiptapEditor],
})
export class SdTiptapEditorInitialValueTest {
  value = signal<string | undefined>("<p>Hello</p>");
}

@Component({
  selector: "sd-tiptap-editor-custom-extensions-test",
  template: `<sd-tiptap-editor [(value)]="value" [extensions]="customExtensions()" />`,
  standalone: true,
  imports: [SdTiptapEditor],
})
export class SdTiptapEditorCustomExtensionsTest {
  value = signal<string | undefined>(undefined);
  customExtensions = signal<AnyExtension[]>([]);
  editorCtrl = viewChild(SdTiptapEditor);
}

// Slice 4: 폼 통합

@Component({
  selector: "sd-tiptap-editor-disabled-test",
  template: `<sd-tiptap-editor [(value)]="value" [disabled]="disabled()" />`,
  standalone: true,
  imports: [SdTiptapEditor],
})
export class SdTiptapEditorDisabledTest {
  value = signal<string | undefined>("<p>Hello</p>");
  disabled = signal(false);
  editorCtrl = viewChild(SdTiptapEditor);
}

@Component({
  selector: "sd-tiptap-editor-readonly-test",
  template: `<sd-tiptap-editor [(value)]="value" [readonly]="readonly()" />`,
  standalone: true,
  imports: [SdTiptapEditor],
})
export class SdTiptapEditorReadonlyTest {
  value = signal<string | undefined>("<p>Hello</p>");
  readonly = signal(false);
  editorCtrl = viewChild(SdTiptapEditor);
}

@Component({
  selector: "sd-tiptap-editor-placeholder-test",
  template: `<sd-tiptap-editor [(value)]="value" [placeholder]="'내용을 입력하세요'" />`,
  standalone: true,
  imports: [SdTiptapEditor],
})
export class SdTiptapEditorPlaceholderTest {
  value = signal<string | undefined>(undefined);
  editorCtrl = viewChild(SdTiptapEditor);
}

@Component({
  selector: "sd-tiptap-editor-required-test",
  template: `<form #formEl><sd-tiptap-editor [(value)]="value" [required]="true" /></form>`,
  standalone: true,
  imports: [SdTiptapEditor],
})
export class SdTiptapEditorRequiredTest {
  value = signal<string | undefined>(undefined);
}

@Component({
  selector: "sd-tiptap-editor-validator-test",
  template: `<form #formEl><sd-tiptap-editor [(value)]="value" [validatorFn]="validator" /></form>`,
  standalone: true,
  imports: [SdTiptapEditor],
})
export class SdTiptapEditorValidatorTest {
  value = signal<string | undefined>("<p>short</p>");
  validator = (val: string | undefined): string | undefined => {
    if (val != null && val.length < 20) return "내용이 너무 짧습니다.";
    return undefined;
  };
}
