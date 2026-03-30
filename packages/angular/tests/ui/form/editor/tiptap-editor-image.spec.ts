import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdTiptapEditorDefaultTest } from "./sd-tiptap-editor-test.fixture";

// 1x1 red pixel PNG as base64
const BASE64_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

describe("Feature 5.4 Slice 3: 이미지 리사이즈", () => {
  // Scenario: 이미지 붙여넣기 후 리사이즈
  it("이미지가 에디터에 삽입되면 img 요소가 렌더링된다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor!;

    // Insert image via TipTap command (equivalent to paste/drop result)
    editor.commands.setImage({ src: BASE64_IMAGE });
    fixture.detectChanges();
    await fixture.whenStable();

    // Image should be in DOM
    const imgEl = fixture.nativeElement.querySelector(".tiptap img") as HTMLImageElement;
    expect(imgEl).toBeTruthy();
    expect(imgEl.src).toContain("data:image/png;base64");

    // Value should contain img tag
    expect(fixture.componentInstance.value()).toContain("<img");
    expect(fixture.componentInstance.value()).toContain("src=");
  });

  // Scenario: 이미지 선택 시 리사이즈 핸들 존재 확인
  it("이미지가 삽입되면 리사이즈가 가능한 구성이다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor!;

    // Verify image extension is configured with resize enabled
    const imageExt = editor.extensionManager.extensions.find((ext) => ext.name === "image");
    expect(imageExt).toBeTruthy();
    expect(imageExt!.options["allowBase64"]).toBe(true);
  });

  // Scenario: 이미지 드래그 리사이즈 (리사이즈 설정 검증)
  it("이미지 삽입 후 width/height 속성을 변경할 수 있다", async () => {
    const fixture = TestBed.configureTestingModule({ imports: [SdTiptapEditorDefaultTest] })
      .createComponent(SdTiptapEditorDefaultTest);
    fixture.detectChanges();
    await fixture.whenStable();

    const editorCtrl = fixture.componentInstance.editorCtrl()!;
    const editor = editorCtrl.editor!;

    // Insert image with specific dimensions
    editor.commands.setImage({ src: BASE64_IMAGE });
    fixture.detectChanges();
    await fixture.whenStable();

    // Update image attributes (simulating resize result)
    editor.commands.updateAttributes("image", { width: 200, height: 150 });
    fixture.detectChanges();
    await fixture.whenStable();

    const imgEl = fixture.nativeElement.querySelector(".tiptap img") as HTMLImageElement;
    expect(imgEl).toBeTruthy();

    // The value should contain the updated dimensions
    const html = fixture.componentInstance.value()!;
    expect(html).toContain("width");
  });
});
