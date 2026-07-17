import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Claude Code 훅은 stdout 1개당 주입 1건이고, 출력이 크면 잘려 파일로 밀려난다(컨텍스트엔 프리뷰만 남음).
// 그래서 rules 는 파일별 훅으로 나눠 주입한다. 그 구조가 조용히 깨지는 경로가 둘이다.
//   1. rules 파일을 추가·개명하고 hooks.json 등록을 빠뜨림 → 그 파일이 주입 안 됨.
//   2. rules 파일이 커짐 → 그 파일이 다시 잘림.
// 둘 다 세션을 열기 전엔 드러나지 않으므로 여기서 사전 차단한다.

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RULES_DIR = join(PLUGIN_ROOT, "rules");
const HOOKS_JSON = join(PLUGIN_ROOT, "hooks", "hooks.json");

// 한도는 바이트가 아니라 문자 수 기준이다 — 12,700자 파일이 "Output too large (12.7KB)" 로 잘렸고,
// 8,802자 파일은 전문 통과했다. 실제 임계값은 약 10,000자로 추정되나 공식 문서에 없어 확정이 아니므로,
// 마진 20% 를 두고 8,000자를 상한으로 쓴다.
const MAX_RULE_CHARS = 8000;

function listRuleFileNames(): string[] {
  return readdirSync(RULES_DIR)
    .filter((fileName) => fileName.endsWith(".md"))
    .sort();
}

function listRegisteredRuleFileNames(): string[] {
  const hooksJson = readFileSync(HOOKS_JSON, "utf8");
  const commands = [...hooksJson.matchAll(/session-start-reference-rules\.ts\\"\s+([^"\\]+)/g)];
  return commands.map((match) => match[1]!.trim()).sort();
}

describe("rules 주입 구조", () => {
  it("rules 파일 목록과 hooks.json 등록 목록이 일치한다", () => {
    expect(listRegisteredRuleFileNames()).toEqual(listRuleFileNames());
  });

  it.each(listRuleFileNames())("%s 이 훅 주입 크기 상한 이하다", (fileName) => {
    const charCount = readFileSync(join(RULES_DIR, fileName), "utf8").length;
    expect(charCount).toBeLessThanOrEqual(MAX_RULE_CHARS);
  });
});
