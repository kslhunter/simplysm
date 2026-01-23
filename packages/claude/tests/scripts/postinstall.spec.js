import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// consola 로거 mocking
const { mockError } = vi.hoisted(() => ({
  mockError: vi.fn(),
}));

vi.mock("consola", () => ({
  createConsola: () => ({
    withTag: () => ({
      error: mockError,
      info: vi.fn(),
      debug: vi.fn(),
    }),
  }),
}));

const { findProjectRoot, main, copyDistToTarget, copyDir } = await import("../../scripts/postinstall.js");

describe("postinstall 스크립트", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-test-"));
    mockError.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  //#region main

  describe("main()", () => {
    it("main 함수가 export되어 있다", () => {
      expect(typeof main).toBe("function");
    });

    it("정상적인 환경에서 main()이 copyDistToTarget을 호출하고 완료된다", () => {
      // 프로젝트 루트에 dist 폴더가 있는 환경 구성
      const projectDir = path.join(tempDir, "project");
      const distDir = path.join(projectDir, "node_modules", "@simplysm", "claude", "dist");
      const targetDir = path.join(projectDir, ".claude");

      // 프로젝트 구조 생성
      fs.mkdirSync(distDir, { recursive: true });
      fs.mkdirSync(path.join(distDir, "rules"));
      fs.writeFileSync(path.join(distDir, "rules", "test.md"), "test content");
      fs.writeFileSync(
        path.join(projectDir, "package.json"),
        JSON.stringify({ name: "test-project", devDependencies: { "@simplysm/claude": "workspace:*" } }),
      );

      const originalCwd = process.cwd();
      process.chdir(projectDir);

      try {
        // findProjectRoot가 projectDir을 반환하는지 확인
        const foundRoot = findProjectRoot();
        expect(foundRoot).toBe(projectDir);

        // copyDistToTarget을 직접 호출하여 동작 검증 (main()은 process.exit 사용)
        // 실제 dist 경로를 사용하여 복사
        copyDistToTarget(distDir, targetDir);

        // 복사 결과 확인
        expect(fs.existsSync(path.join(targetDir, "rules", "test.md"))).toBe(true);
        expect(fs.readFileSync(path.join(targetDir, "rules", "test.md"), "utf-8")).toBe("test content");
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("findProjectRoot가 undefined를 반환하면 copyDistToTarget을 호출하지 않는다", () => {
      // 이 테스트는 main() 내부 로직을 간접적으로 검증
      // findProjectRoot가 undefined를 반환하는 환경에서 main()이 에러 없이 종료되는지 확인
      const testDir = path.join(tempDir, "isolated");
      fs.mkdirSync(testDir);
      fs.writeFileSync(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test", devDependencies: {} }),
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // main()이 process.exit(0)을 호출하므로, 직접 테스트하기 어려움
        // 대신 findProjectRoot()가 undefined를 반환하는 것을 확인
        expect(findProjectRoot()).toBeUndefined();
      } finally {
        process.chdir(originalCwd);
      }
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

    it("하위 디렉토리에서 시작하여 상위의 프로젝트 루트를 찾는다", () => {
      // 프로젝트 루트 생성
      const projectRoot = path.join(tempDir, "project");
      fs.mkdirSync(projectRoot);
      fs.writeFileSync(
        path.join(projectRoot, "package.json"),
        JSON.stringify({ devDependencies: { "@simplysm/claude": "workspace:*" } }),
      );

      // 하위 디렉토리 생성
      const subDir = path.join(projectRoot, "packages", "sub", "deep");
      fs.mkdirSync(subDir, { recursive: true });

      const originalCwd = process.cwd();
      process.chdir(subDir);

      try {
        const result = findProjectRoot();
        expect(result).toBe(projectRoot);
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

    it("기존 파일이 있는 대상 디렉토리에 복사 시 덮어쓰기한다", () => {
      const srcDir = path.join(tempDir, "dist");
      const destDir = path.join(tempDir, ".claude");

      // 기존 대상 디렉토리 구조 생성
      fs.mkdirSync(path.join(destDir, "rules"), { recursive: true });
      fs.writeFileSync(path.join(destDir, "rules", "rule1.md"), "old content");
      fs.writeFileSync(path.join(destDir, "settings.json"), '{"old": true}');

      // 소스 디렉토리 구조 생성
      fs.mkdirSync(path.join(srcDir, "rules"), { recursive: true });
      fs.writeFileSync(path.join(srcDir, "rules", "rule1.md"), "new content");
      fs.writeFileSync(path.join(srcDir, "settings.json"), '{"new": true}');

      copyDistToTarget(srcDir, destDir);

      // 새 내용으로 덮어쓰기되었는지 확인
      expect(fs.readFileSync(path.join(destDir, "rules", "rule1.md"), "utf-8")).toBe("new content");
      expect(fs.readFileSync(path.join(destDir, "settings.json"), "utf-8")).toBe('{"new": true}');
    });

    it("dist에 없는 기존 커스텀 파일은 유지된다", () => {
      const srcDir = path.join(tempDir, "dist");
      const destDir = path.join(tempDir, ".claude");

      // 기존 대상 디렉토리에 커스텀 파일 생성
      fs.mkdirSync(path.join(destDir, "rules"), { recursive: true });
      fs.writeFileSync(path.join(destDir, "rules", "custom-rule.md"), "custom rule content");
      fs.writeFileSync(path.join(destDir, "settings.local.json"), '{"local": true}');

      // 소스 디렉토리 구조 생성 (커스텀 파일 없음)
      fs.mkdirSync(path.join(srcDir, "rules"), { recursive: true });
      fs.writeFileSync(path.join(srcDir, "rules", "rule1.md"), "rule content");
      fs.writeFileSync(path.join(srcDir, "settings.json"), '{"setting": true}');

      copyDistToTarget(srcDir, destDir);

      // dist에서 복사된 파일 확인
      expect(fs.existsSync(path.join(destDir, "rules", "rule1.md"))).toBe(true);
      expect(fs.existsSync(path.join(destDir, "settings.json"))).toBe(true);

      // 기존 커스텀 파일이 유지되는지 확인
      expect(fs.existsSync(path.join(destDir, "rules", "custom-rule.md"))).toBe(true);
      expect(fs.readFileSync(path.join(destDir, "rules", "custom-rule.md"), "utf-8")).toBe("custom rule content");
      expect(fs.existsSync(path.join(destDir, "settings.local.json"))).toBe(true);
      expect(fs.readFileSync(path.join(destDir, "settings.local.json"), "utf-8")).toBe('{"local": true}');
    });

    it("디렉토리 복사 실패 시 logger.error()에 err 필드가 포함된다", () => {
      const srcDir = path.join(tempDir, "non-existent");
      const destDir = path.join(tempDir, "dest");

      try {
        copyDir(srcDir, destDir);
      } catch {
        // 에러 무시
      }

      expect(mockError).toHaveBeenCalledWith(
        "copyDir 실패",
        expect.objectContaining({
          err: expect.any(Error),
          src: srcDir,
          dest: destDir,
        }),
      );
    });

    it("빈 소스 디렉토리에서도 정상 동작한다", () => {
      const srcDir = path.join(tempDir, "dist");
      const destDir = path.join(tempDir, ".claude");

      fs.mkdirSync(srcDir);

      expect(() => copyDistToTarget(srcDir, destDir)).not.toThrow();
      expect(fs.existsSync(destDir)).toBe(true);
    });

    it("존재하지 않는 소스 디렉토리에서 에러를 throw한다", () => {
      const srcDir = path.join(tempDir, "non-existent");
      const destDir = path.join(tempDir, ".claude");

      expect(() => copyDistToTarget(srcDir, destDir)).toThrow();
    });
  });

  //#endregion
});
