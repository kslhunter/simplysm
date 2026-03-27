import { readFileSync } from "fs";
import { resolve } from "path";

const pkgRoot = resolve(import.meta.dirname, "..");
const monoRoot = resolve(pkgRoot, "../..");

describe("Slice 4: 문서 갱신 및 npm deprecated", () => {
  // Scenario: 패키지 README 갱신
  test("패키지 README.md에 @simplysm/capacitor-plugin-intent 설치 안내가 있다", () => {
    const readme = readFileSync(resolve(pkgRoot, "README.md"), "utf-8");
    expect(readme).toContain("@simplysm/capacitor-plugin-intent");
  });

  test("패키지 README.md에 broadcast/Broadcast 문자열이 존재하지 않는다", () => {
    const readme = readFileSync(resolve(pkgRoot, "README.md"), "utf-8");
    // BroadcastReceiver는 Android API 용어이므로 제외하지 않음 — 여기서는 플러그인 이름 참조만 검사
    expect(readme).not.toMatch(/capacitor-plugin-broadcast/);
    expect(readme).not.toMatch(/\bBroadcast\b/);
  });

  // Scenario: 루트 README 갱신
  test("루트 README.md에 capacitor-plugin-intent 항목이 존재한다", () => {
    const readme = readFileSync(resolve(monoRoot, "README.md"), "utf-8");
    expect(readme).toContain("capacitor-plugin-intent");
  });

  test("루트 README.md에 capacitor-plugin-broadcast 항목은 존재하지 않는다", () => {
    const readme = readFileSync(resolve(monoRoot, "README.md"), "utf-8");
    expect(readme).not.toContain("capacitor-plugin-broadcast");
  });
});
