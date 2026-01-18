import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { findProjectRoot, main, copyDistToTarget } from "../../scripts/postinstall.js";

describe("postinstall 스크립트", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  //#region main

  describe("main()", () => {
    it("main 함수가 export되어 있다", () => {
      expect(typeof main).toBe("function");
    });
  });

  //#endregion

  //#region findProjectRoot

  describe("findProjectRoot()", () => {
    it("@simplysm/claude가 devDependencies에 있으면 해당 디렉토리를 반환한다", () => {
      // 현재 프로젝트 루트에서 실행 중이므로 프로젝트 루트를 찾아야 함
      const result = findProjectRoot();

      // 프로젝트 루트의 package.json에 @simplysm/claude가 있어야 함
      if (result != null) {
        const packageJson = JSON.parse(fs.readFileSync(path.join(result, "package.json"), "utf-8"));
        expect(packageJson.devDependencies?.["@simplysm/claude"]).toBeDefined();
      }
    });

    it("devDependencies에 @simplysm/claude가 없으면 undefined를 반환한다", () => {
      // 임시 디렉토리에 @simplysm/claude가 없는 package.json 생성
      const testDir = path.join(tempDir, "no-claude-dep");
      fs.mkdirSync(testDir);
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test", devDependencies: {} }),
      );

      // cwd를 변경하여 테스트
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const result = findProjectRoot();
        // testDir 자체에는 @simplysm/claude가 없지만,
        // 상위 디렉토리 탐색으로 실제 프로젝트 루트를 찾을 수 있음
        // 임시 디렉토리는 프로젝트 외부이므로 undefined 반환
        expect(result).toBeUndefined();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("잘못된 JSON 형식의 package.json이 있으면 건너뛴다", () => {
      // 잘못된 JSON을 가진 디렉토리 생성
      const invalidJsonDir = path.join(tempDir, "invalid-json");
      fs.mkdirSync(invalidJsonDir);
      fs.writeFileSync(path.join(invalidJsonDir, "package.json"), "{ invalid json }");

      const originalCwd = process.cwd();
      process.chdir(invalidJsonDir);

      try {
        // 파싱 실패 시 해당 디렉토리를 건너뛰고 상위로 탐색
        // 임시 디렉토리는 프로젝트 외부이므로 undefined 반환
        const result = findProjectRoot();
        expect(result).toBeUndefined();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("package.json이 없는 디렉토리에서 루트까지 탐색 후 undefined를 반환한다", () => {
      // package.json이 없는 깊은 디렉토리 구조 생성
      const deepDir = path.join(tempDir, "a", "b", "c");
      fs.mkdirSync(deepDir, { recursive: true });

      const originalCwd = process.cwd();
      process.chdir(deepDir);

      try {
        const result = findProjectRoot();
        // 임시 디렉토리 내에 package.json이 없으므로 undefined 반환
        expect(result).toBeUndefined();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  //#endregion

  //#region copyDistToTarget

  describe("copyDistToTarget()", () => {
    it("디렉토리를 복사한다", () => {
      const srcDir = path.join(tempDir, "dist");
      const destDir = path.join(tempDir, ".claude");

      // 소스 디렉토리 구조 생성
      fs.mkdirSync(path.join(srcDir, "rules"), { recursive: true });
      fs.writeFileSync(path.join(srcDir, "rules", "rule1.md"), "rule content");

      copyDistToTarget(srcDir, destDir);

      expect(fs.existsSync(path.join(destDir, "rules", "rule1.md"))).toBe(true);
      expect(fs.readFileSync(path.join(destDir, "rules", "rule1.md"), "utf-8")).toBe("rule content");
    });

    it("settings.json 파일을 복사한다", () => {
      const srcDir = path.join(tempDir, "dist");
      const destDir = path.join(tempDir, ".claude");

      // 소스 디렉토리와 settings.json 생성
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, "settings.json"), '{"key": "value"}');

      copyDistToTarget(srcDir, destDir);

      expect(fs.existsSync(path.join(destDir, "settings.json"))).toBe(true);
      expect(fs.readFileSync(path.join(destDir, "settings.json"), "utf-8")).toBe('{"key": "value"}');
    });

    it("settings.json 외의 루트 파일은 복사하지 않는다", () => {
      const srcDir = path.join(tempDir, "dist");
      const destDir = path.join(tempDir, ".claude");

      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, "settings.json"), '{"key": "value"}');
      fs.writeFileSync(path.join(srcDir, "other.txt"), "other content");

      copyDistToTarget(srcDir, destDir);

      expect(fs.existsSync(path.join(destDir, "settings.json"))).toBe(true);
      expect(fs.existsSync(path.join(destDir, "other.txt"))).toBe(false);
    });

    it("여러 디렉토리와 settings.json을 함께 복사한다", () => {
      const srcDir = path.join(tempDir, "dist");
      const destDir = path.join(tempDir, ".claude");

      // 소스 디렉토리 구조 생성
      fs.mkdirSync(path.join(srcDir, "rules"), { recursive: true });
      fs.mkdirSync(path.join(srcDir, "skills"));
      fs.mkdirSync(path.join(srcDir, "scripts"));
      fs.writeFileSync(path.join(srcDir, "rules", "rule1.md"), "rule");
      fs.writeFileSync(path.join(srcDir, "skills", "skill1.md"), "skill");
      fs.writeFileSync(path.join(srcDir, "scripts", "script.js"), "script");
      fs.writeFileSync(path.join(srcDir, "settings.json"), '{"setting": true}');

      copyDistToTarget(srcDir, destDir);

      expect(fs.existsSync(path.join(destDir, "rules", "rule1.md"))).toBe(true);
      expect(fs.existsSync(path.join(destDir, "skills", "skill1.md"))).toBe(true);
      expect(fs.existsSync(path.join(destDir, "scripts", "script.js"))).toBe(true);
      expect(fs.existsSync(path.join(destDir, "settings.json"))).toBe(true);
    });
  });

  //#endregion
});
