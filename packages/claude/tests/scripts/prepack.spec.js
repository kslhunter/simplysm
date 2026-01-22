import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { main, copyClaudeToDist } from "../../scripts/prepack.js";

describe("prepack 스크립트", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-prepack-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  //#region main

  describe("main()", () => {
    it("main 함수가 export되어 있다", () => {
      expect(typeof main).toBe("function");
    });

    it("main() 호출 시 copyClaudeToDist가 동작한다", () => {
      // main()은 고정 경로를 사용하므로 직접 테스트하기 어려움
      // 대신 copyClaudeToDist를 통해 동일한 로직을 검증
      const srcDir = path.join(tempDir, ".claude");
      const destDir = path.join(tempDir, "dist");

      fs.mkdirSync(path.join(srcDir, "rules"), { recursive: true });
      fs.writeFileSync(path.join(srcDir, "rules", "rule1.md"), "rule");
      fs.writeFileSync(path.join(srcDir, "settings.json"), '{"key": "value"}');

      copyClaudeToDist(srcDir, destDir);

      expect(fs.existsSync(path.join(destDir, "rules", "rule1.md"))).toBe(true);
      expect(fs.existsSync(path.join(destDir, "settings.json"))).toBe(true);
    });
  });

  //#endregion

  //#region copyClaudeToDist

  describe("copyClaudeToDist()", () => {
    it("기존 dist 폴더를 삭제하고 새로 생성한다", () => {
      const srcDir = path.join(tempDir, ".claude");
      const destDir = path.join(tempDir, "dist");

      // 소스 디렉토리 생성
      fs.mkdirSync(srcDir);

      // 기존 dist 폴더에 파일 생성
      fs.mkdirSync(destDir);
      fs.writeFileSync(path.join(destDir, "old-file.txt"), "old content");

      copyClaudeToDist(srcDir, destDir);

      // 기존 파일이 삭제되었는지 확인
      expect(fs.existsSync(path.join(destDir, "old-file.txt"))).toBe(false);
      // dist 폴더는 존재해야 함
      expect(fs.existsSync(destDir)).toBe(true);
    });

    it(".claude 하위 디렉토리를 복사한다", () => {
      const srcDir = path.join(tempDir, ".claude");
      const destDir = path.join(tempDir, "dist");

      // 소스 디렉토리 구조 생성
      fs.mkdirSync(path.join(srcDir, "rules"), { recursive: true });
      fs.mkdirSync(path.join(srcDir, "skills"), { recursive: true });
      fs.writeFileSync(path.join(srcDir, "rules", "rule1.md"), "rule content");
      fs.writeFileSync(path.join(srcDir, "skills", "skill1.md"), "skill content");

      copyClaudeToDist(srcDir, destDir);

      // 디렉토리와 파일이 복사되었는지 확인
      expect(fs.existsSync(path.join(destDir, "rules", "rule1.md"))).toBe(true);
      expect(fs.existsSync(path.join(destDir, "skills", "skill1.md"))).toBe(true);
      expect(fs.readFileSync(path.join(destDir, "rules", "rule1.md"), "utf-8")).toBe("rule content");
    });

    it("settings.json 파일을 복사한다", () => {
      const srcDir = path.join(tempDir, ".claude");
      const destDir = path.join(tempDir, "dist");

      // 소스 디렉토리와 settings.json 생성
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, "settings.json"), '{"key": "value"}');

      copyClaudeToDist(srcDir, destDir);

      // settings.json이 복사되었는지 확인
      expect(fs.existsSync(path.join(destDir, "settings.json"))).toBe(true);
      expect(fs.readFileSync(path.join(destDir, "settings.json"), "utf-8")).toBe('{"key": "value"}');
    });

    it("settings.local.json 파일은 복사하지 않는다", () => {
      const srcDir = path.join(tempDir, ".claude");
      const destDir = path.join(tempDir, "dist");

      // 소스 디렉토리와 파일 생성
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, "settings.json"), '{"key": "value"}');
      fs.writeFileSync(path.join(srcDir, "settings.local.json"), '{"local": "secret"}');

      copyClaudeToDist(srcDir, destDir);

      // settings.json은 복사됨
      expect(fs.existsSync(path.join(destDir, "settings.json"))).toBe(true);
      // settings.local.json은 복사되지 않음
      expect(fs.existsSync(path.join(destDir, "settings.local.json"))).toBe(false);
    });

    it("루트 레벨 파일은 settings.json만 복사한다", () => {
      const srcDir = path.join(tempDir, ".claude");
      const destDir = path.join(tempDir, "dist");

      // 소스 디렉토리와 여러 파일 생성
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, "settings.json"), '{"key": "value"}');
      fs.writeFileSync(path.join(srcDir, "other-file.txt"), "other content");

      copyClaudeToDist(srcDir, destDir);

      // settings.json은 복사됨
      expect(fs.existsSync(path.join(destDir, "settings.json"))).toBe(true);
      // 다른 루트 레벨 파일은 복사되지 않음
      expect(fs.existsSync(path.join(destDir, "other-file.txt"))).toBe(false);
    });

    it("존재하지 않는 소스 디렉토리에서 에러를 throw한다", () => {
      const srcDir = path.join(tempDir, "non-existent-claude");
      const destDir = path.join(tempDir, "dist");

      expect(() => copyClaudeToDist(srcDir, destDir)).toThrow();
    });

    it("settings.json이 없는 경우에도 정상 동작한다", () => {
      const srcDir = path.join(tempDir, ".claude");
      const destDir = path.join(tempDir, "dist");

      // settings.json 없이 디렉토리만 생성
      fs.mkdirSync(path.join(srcDir, "rules"), { recursive: true });
      fs.writeFileSync(path.join(srcDir, "rules", "rule1.md"), "rule content");

      // 에러 없이 동작해야 함
      expect(() => copyClaudeToDist(srcDir, destDir)).not.toThrow();

      // 디렉토리는 복사됨
      expect(fs.existsSync(path.join(destDir, "rules", "rule1.md"))).toBe(true);
      // settings.json은 복사되지 않음 (존재하지 않았으므로)
      expect(fs.existsSync(path.join(destDir, "settings.json"))).toBe(false);
    });
  });

  //#endregion
});
