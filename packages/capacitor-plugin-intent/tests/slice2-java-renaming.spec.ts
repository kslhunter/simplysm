import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const pkgRoot = resolve(import.meta.dirname, "..");
const javaBase = resolve(pkgRoot, "android/src/main/java/kr/co/simplysm/capacitor");

describe("Slice 2: Java 소스 리네이밍", () => {
  // Scenario: Java 패키지 경로 변경
  test("IntentPlugin.java가 intent/ 경로에 존재한다", () => {
    expect(existsSync(resolve(javaBase, "intent/IntentPlugin.java"))).toBe(true);
  });

  test("이전 broadcast/ 디렉토리는 존재하지 않는다", () => {
    expect(existsSync(resolve(javaBase, "broadcast"))).toBe(false);
  });

  // Scenario: Java 패키지 선언 변경
  test("package 선언이 kr.co.simplysm.capacitor.intent이다", () => {
    const java = readFileSync(resolve(javaBase, "intent/IntentPlugin.java"), "utf-8");
    expect(java).toContain("package kr.co.simplysm.capacitor.intent;");
  });

  // Scenario: Java 클래스명 변경
  test("클래스명이 IntentPlugin이다", () => {
    const java = readFileSync(resolve(javaBase, "intent/IntentPlugin.java"), "utf-8");
    expect(java).toContain("public class IntentPlugin extends Plugin");
  });

  // Scenario: Capacitor 플러그인 등록명 변경
  test('@CapacitorPlugin(name = "Intent")로 등록된다', () => {
    const java = readFileSync(resolve(javaBase, "intent/IntentPlugin.java"), "utf-8");
    expect(java).toContain('@CapacitorPlugin(name = "Intent")');
  });
});
