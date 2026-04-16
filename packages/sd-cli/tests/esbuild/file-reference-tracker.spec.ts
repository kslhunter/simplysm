import { describe, it, expect, beforeEach } from "vitest";
import { FileReferenceTracker } from "../../src/esbuild/file-reference-tracker.js";

describe("FileReferenceTracker", () => {
  let tracker: FileReferenceTracker;

  beforeEach(() => {
    tracker = new FileReferenceTracker();
  });

  //#region Acceptance Tests

  describe("리소스 의존성 등록 및 조회", () => {
    it("add로 등록된 참조 파일이 referencedFiles에 포함된다", () => {
      tracker.add("comp.ts", ["style.scss", "template.html"]);

      const refs = new Set(tracker.referencedFiles);
      expect(refs.has("style.scss")).toBe(true);
      expect(refs.has("template.html")).toBe(true);
    });

    it("자기 참조(containingFile)는 referencedFiles에 포함되지 않는다", () => {
      tracker.add("comp.ts", ["comp.ts", "style.scss"]);

      const refs = new Set(tracker.referencedFiles);
      expect(refs.has("comp.ts")).toBe(false);
      expect(refs.has("style.scss")).toBe(true);
    });
  });

  describe("변경 파일에 대한 전이적 영향 파일 확장", () => {
    it("참조 파일 변경 시 containingFile도 반환한다", () => {
      tracker.add("comp.ts", ["style.scss"]);

      const changed = new Set(["style.scss"]);
      const result = tracker.update(changed);

      expect(result.has("style.scss")).toBe(true);
      expect(result.has("comp.ts")).toBe(true);
    });

    it("update 후 stale 레코드가 정리된다", () => {
      tracker.add("comp.ts", ["style.scss"]);

      tracker.update(new Set(["style.scss"]));

      // stale 레코드 정리 확인: style.scss가 더 이상 referencedFiles에 없어야 함
      const refs = new Set(tracker.referencedFiles);
      expect(refs.has("style.scss")).toBe(false);
    });
  });

  describe("변경되지 않은 파일은 원본 Set만 반환", () => {
    it("의존성이 없는 파일 변경 시 원본 Set을 그대로 반환한다", () => {
      tracker.add("comp.ts", ["style.scss"]);

      const changed = new Set(["other.ts"]);
      const result = tracker.update(changed);

      // 원본 Set이 그대로 반환됨 (새 Set이 아님)
      expect(result).toBe(changed);
      expect(result.has("other.ts")).toBe(true);
      expect(result.size).toBe(1);
    });
  });

  //#endregion

  //#region Unit Tests — Edge Cases

  it("경로가 normalize되어 저장된다", () => {
    tracker.add("src\\comp.ts", ["src\\style.scss"]);

    const refs = new Set(tracker.referencedFiles);
    // path.normalize가 적용되어야 함
    expect(refs.size).toBe(1);
  });

  it("동일 참조 파일을 여러 containingFile에서 등록할 수 있다", () => {
    tracker.add("comp-a.ts", ["shared.scss"]);
    tracker.add("comp-b.ts", ["shared.scss"]);

    const changed = new Set(["shared.scss"]);
    const result = tracker.update(changed);

    expect(result.has("comp-a.ts")).toBe(true);
    expect(result.has("comp-b.ts")).toBe(true);
    expect(result.has("shared.scss")).toBe(true);
  });

  it("빈 referencedFiles로 add 호출 시 아무 것도 등록되지 않는다", () => {
    tracker.add("comp.ts", []);

    const refs = new Set(tracker.referencedFiles);
    expect(refs.size).toBe(0);
  });

  //#endregion
});
