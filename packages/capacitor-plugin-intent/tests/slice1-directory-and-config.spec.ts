import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const pkgRoot = resolve(import.meta.dirname, "..");
const monoRoot = resolve(pkgRoot, "../..");

describe("Slice 1: 디렉토리 이동 및 설정 파일 변경", () => {
  // Scenario: 디렉토리 이동
  test("패키지가 packages/capacitor-plugin-intent/ 경로에 존재한다", () => {
    expect(existsSync(resolve(monoRoot, "packages/capacitor-plugin-intent"))).toBe(true);
  });

  test("packages/capacitor-plugin-broadcast/ 경로는 존재하지 않는다", () => {
    expect(existsSync(resolve(monoRoot, "packages/capacitor-plugin-broadcast"))).toBe(false);
  });

  // Scenario: npm 패키지명 변경
  test("package.json의 name이 @simplysm/capacitor-plugin-intent이다", () => {
    const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf-8"));
    expect(pkg.name).toBe("@simplysm/capacitor-plugin-intent");
  });

  // Scenario: package.json 메타데이터 갱신
  test("package.json의 description에 Intent가 포함된다", () => {
    const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf-8"));
    expect(pkg.description).toContain("Intent");
  });

  test("package.json의 repository.directory가 packages/capacitor-plugin-intent이다", () => {
    const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf-8"));
    expect(pkg.repository.directory).toBe("packages/capacitor-plugin-intent");
  });

  // Scenario: simplysm.js 설정 키 변경
  test("simplysm.js에서 capacitor-plugin-intent 키로 패키지가 등록되어 있다", async () => {
    const config = (await import(resolve(monoRoot, "simplysm.js"))).default();
    expect(config.packages["capacitor-plugin-intent"]).toBeDefined();
  });

  test("simplysm.js에서 capacitor-plugin-broadcast 키는 존재하지 않는다", async () => {
    const config = (await import(resolve(monoRoot, "simplysm.js"))).default();
    expect(config.packages["capacitor-plugin-broadcast"]).toBeUndefined();
  });

  // Scenario: build.gradle namespace 변경
  test("build.gradle namespace가 kr.co.simplysm.capacitor.intent이다", () => {
    const gradle = readFileSync(resolve(pkgRoot, "android/build.gradle"), "utf-8");
    expect(gradle).toContain('namespace "kr.co.simplysm.capacitor.intent"');
  });
});
