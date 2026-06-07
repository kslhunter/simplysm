export const meta = {
  name: "sd-review",
  description:
    "산출물(코드·문서 등)을 도메인 자동판정 후 적용 룰을 전수·적대적으로 검증해 [자동]/결정 분류로 보고하는 멀티에이전트 리뷰",
  phases: [
    { title: "Plan", detail: "대상 식별 + 도메인 판정 + 적용 룰 동적 발견 + 리뷰 차원 도출" },
    { title: "Review", detail: "도출된 차원별 전수 룰 대조 (병렬)" },
    { title: "Verify", detail: "발견 항목별 적대적 검증 (병렬)" },
  ],
};

// ── 입력 ───────────────────────────────────────────────────────
// args: 경로 문자열 / 경로 배열 / 자연어 대상 설명 무엇이든 허용.
if (args == null || (typeof args === "string" && args.trim() === "")) {
  throw new Error("리뷰 대상을 args 로 전달하세요 (파일/디렉터리 경로 또는 대상 설명).");
}
const targetDesc = typeof args === "string" ? args : JSON.stringify(args);

// ── 공통 원칙(모든 단계 주입) ──────────────────────────────────
const PRINCIPLES = `
검증 원칙(전수·근거 기반):
- 표본·대표 패턴만 보지 말고 모든 단위(코드: 함수·라인 / 문서: 섹션·문장)를 인용한 룰 항목 전체에 빠짐없이 대조.
- 발견 항목은 (위치 + 위반한 룰 원문 인용 + 코드/문장 근거)를 반드시 갖출 것. 근거 없는 추측·일반론·개인 취향 지적 금지.
- 적용 룰의 출처는 (a) 컨텍스트에 자동 주입된 프로젝트/글로벌 지침(설계룰·행동 규칙 등) 과 (b) 아래에서 발견·전달된 룰 파일 뿐. 그 밖의 임의 기준으로 지적하지 말 것.

분류(category) 기준:
- '자동' = 오타·맞춤법·띄어쓰기·조사 오용·들여쓰기/줄바꿈 통일·trailing whitespace·세미콜론·중복 제거 등 순수 형식 정리, 또는 변경 전후 의미·적용 범위가 동일함이 명백한 표현 정리.
- '결정' = 위 '자동' 두 종류 어디에도 해당하지 않는, 의미·적용 범위가 조금이라도 변동될 가능성이 있는 모든 항목.

심각도(severity): error=동작 결함·데이터 정합성·룰 명백 위반, warn=권고 위반·잠재 위험, info=경미·형식.
`;

// ── fail-fast 가드 ─────────────────────────────────────────────
// parallel/pipeline 배리어 직후 호출. 결과에 null(에이전트 reject/스킵)이 하나라도 있으면
// 부분 결과로 진행하지 않고 즉시 throw. 정상이지만 빈 결과(빈 배열 등)는 null 이 아니라 통과.
function assertNoFailures(results, stage, labels) {
  const failed = results.flatMap((r, i) => (r ? [] : [labels?.[i] ?? `#${i}`]));
  if (failed.length > 0) {
    throw new Error(
      `[${stage}] 에이전트 ${failed.length}/${results.length}건 실행 실패(null) — 부분 결과로 진행 금지(fail-fast). 실패: ${failed.join(", ")}. resume 로 재실행하면 성공분은 캐시됩니다.`,
    );
  }
}

// ── 스키마 ─────────────────────────────────────────────────────
const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["units", "dimensions", "strategy", "notes"],
  properties: {
    units: {
      type: "array",
      description: "확정된 리뷰 단위",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "domain"],
        properties: {
          path: { type: "string", description: "Read 도구로 직접 접근 가능한 경로. 사용자가 절대경로(예: 다른 워크스페이스)를 줬으면 절대경로 그대로 보존. 현재 레포 내부 대상일 때만 레포 기준 상대경로 허용." },
          domain: { type: "string", description: "산출물 도메인 판정" },
        },
      },
    },
    dimensions: {
      type: "array",
      description: "겹치지 않게 묶은 리뷰 차원",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "title", "ruleSources", "units", "focus"],
        properties: {
          key: { type: "string" },
          title: { type: "string" },
          ruleSources: {
            type: "array",
            items: { type: "string" },
            description: "이 차원이 적용할 룰 소스의 실제 경로 또는 'auto-injected: <지침명>'",
          },
          units: { type: "array", items: { type: "string" }, description: "이 차원이 검사할 단위 경로(비우면 전체)" },
          focus: { type: "string", description: "이 차원의 검사 초점" },
        },
      },
    },
    strategy: { type: "string", description: "선택한 분할 축(룰축/파일축/매트릭스)과 그 이유" },
    notes: { type: "string", description: "도메인 판정·룰 발견 근거 요약" },
  },
};

const FINDINGS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "file", "line", "severity", "category", "rule", "evidence", "fix"],
        properties: {
          title: { type: "string", description: "한 줄 요약" },
          file: { type: "string", description: "파일 경로 또는 basename" },
          line: { type: "string", description: "라인/섹션 번호 또는 범위" },
          severity: { type: "string", enum: ["error", "warn", "info"] },
          category: { type: "string", enum: ["자동", "결정"] },
          rule: { type: "string", description: "위반한 룰 출처 + 원문 인용" },
          evidence: { type: "string", description: "코드/문장 근거 인용" },
          fix: { type: "string", description: "제안 수정" },
        },
      },
    },
  },
};

const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "verdict",
    "reason",
    "final_severity",
    "final_category",
    "fix_verdict",
    "fix_assessment",
    "fix_revised",
  ],
  properties: {
    verdict: { type: "string", enum: ["confirmed", "rejected", "uncertain"], description: "발견(문제) 자체의 진위" },
    reason: { type: "string", description: "룰 원문과 대상을 재확인한 판정 근거" },
    final_severity: { type: "string", enum: ["error", "warn", "info"] },
    final_category: { type: "string", enum: ["자동", "결정"] },
    fix_verdict: {
      type: "string",
      enum: ["sound", "risky", "flawed", "uncertain"],
      description: "제안 해결책의 적대적 검증 결과 (발견이 rejected 면 uncertain)",
    },
    fix_assessment: {
      type: "string",
      description: "해결책이 문제를 실제로 해결하는지, 새 룰 위반·회귀·엣지케이스(결측·동시성·soft delete·권한 등)를 유발하는지 근거",
    },
    fix_revised: {
      type: "string",
      description: "해결책이 flawed/risky 면 교정된 해결책. sound 면 원안을 그대로 다시 기술. 발견 rejected 면 빈 문자열.",
    },
  },
};

// ── [Plan] 대상·도메인·룰·차원 자율 도출 ───────────────────────
phase("Plan");
const plan = await agent(
  `리뷰 대상: ${targetDesc}

${PRINCIPLES}

너의 일 (범용 리뷰 1단계 — 계획 수립). 아래를 스스로 수행:

1. 대상 식별: 위 대상을 구체 리뷰 단위로 확정.
   - 경로/디렉터리면 Glob 으로 파일 수집(dist/.back/node_modules/.gitignore 등재 경로 제외).
   - 자연어 설명이면 Grep/Glob 으로 해당 산출물을 찾아 단위 확정.
   - 각 단위의 경로는 Read 로 직접 접근 가능한 형태로 확보. 사용자가 절대경로(예: 다른 워크스페이스)를 줬으면 그 절대경로를 그대로 보존하고 상대경로로 깎지 말 것 — 하위 Review/Verify 단계가 그 경로를 그대로 Read 함. 현재 레포 내부 대상일 때만 레포 기준 상대경로 사용.

2. 도메인 판정: 각 단위가 어떤 산출물 도메인인지 판정.
   예: "@simplysm v14 화면 컴포넌트", "@simplysm v14 라이브러리/CLI 코드", "ORM/DB 스키마", "LLM 문서(SKILL.md/CLAUDE.md/.claude/rules)", "사람용 문서", "스킬 정의", "spec.md" 등.

3. 적용 룰 동적 발견: 도메인에 맞는 룰 소스를 실제로 찾아 경로를 적음.
   - 컨텍스트에 자동 주입된 프로젝트/글로벌 지침(설계룰·행동 규칙 등) → ruleSources 에 'auto-injected: <지침명>' 으로 표기.
   - Glob ".claude/rules/*.md".
   - 가장 가까운 CLAUDE.md (있으면).
   - 도메인 관련 ".claude/references/**" 매뉴얼 (예: simplysm14 화면이면 references/sd-simplysm14/manuals/client-*.md, orm.md 등; 실제 Glob 으로 존재 확인).
   - 도메인 관련 ".claude/skills/*/SKILL.md" (예: 스킬을 리뷰하면 sd-skill, spec.md 면 sd-spec, 매뉴얼이면 sd-manual).
   - "기존 동종 산출물 패턴" 자체도 룰 소스로 취급(코드베이스 비교) → ruleSources 에 'existing-pattern' 표기.

4. 리뷰 차원 도출(분할 축 자율 결정): 대상 규모(단위 수·파일 크기·룰 도메인 수)를 먼저 가늠한 뒤, 가장 효율적인 분할 축을 스스로 택해 차원을 구성한다.
   - 룰축: 파일 적고 룰 도메인 많음 → 차원 = 룰 묶음, units = 전체 단위.
   - 파일축: 파일 많고 룰 도메인 적음 → 차원 = 파일(또는 파일 클러스터), ruleSources = 적용 룰 전체, units = 그 파일들.
   - 매트릭스: 파일도 많고 룰 도메인도 많은 대규모 → 파일 클러스터 × 룰 묶음 조합.
   각 차원에 key, title, ruleSources(실제 경로/표기), units(이 차원이 검사할 단위 경로 — 자율 분할의 핵심이니 반드시 명시), focus.
   불변식: (a) 모든 (단위 × 적용 룰) 조합이 정확히 한 차원에서 빠짐없이 커버될 것 — 누락·중복 금지, (b) 한 차원의 컨텍스트가 과부하되지 않게 적정 크기로 자를 것, (c) 차원 수는 보통 3~8개.
   선택한 분할 축과 이유를 strategy 에, 도메인·룰 발견 근거를 notes 에 적는다.

units / dimensions / strategy / notes 를 반환.`,
  { label: "plan", phase: "Plan", schema: PLAN_SCHEMA },
);

if (!plan) throw new Error("[Plan] 계획 수립 에이전트 실행 실패(null) — 중단.");
const UNITS = (plan.units ?? []).filter(Boolean);
const DIMENSIONS = (plan.dimensions ?? []).filter(Boolean);
if (UNITS.length === 0) throw new Error("리뷰 단위를 식별하지 못했습니다.");
if (DIMENSIONS.length === 0) throw new Error("리뷰 차원을 도출하지 못했습니다.");
log(
  `단위 ${UNITS.length}개 / 분할: ${plan.strategy ?? "?"} / 차원 ${DIMENSIONS.length}개: ${DIMENSIONS.map((d) => d.title).join(", ")}`,
);

const ALL_UNIT_PATHS = UNITS.map((u) => u.path);

// ── [Review] 전 차원 전수 룰 대조 (배리어: 전량 수집 후 비용 가드) ──
phase("Review");
const reviewRaw = (
  await parallel(
    DIMENSIONS.map((d) => () =>
      agent(
        `${PRINCIPLES}

리뷰 차원: ${d.title}
검사 초점: ${d.focus}

이 차원에서 적용할 룰 소스(존재하는 파일은 전부 Read; 'auto-injected'/'existing-pattern' 는 컨텍스트·코드베이스 조사로 처리):
${(d.ruleSources ?? []).map((r) => "- " + r).join("\n") || "- (명시 없음 — 자동 주입 지침 + 코드베이스 패턴 기준)"}

리뷰 단위(전부 Read 로 끝까지):
${((d.units && d.units.length ? d.units : ALL_UNIT_PATHS)).map((p) => "- " + p).join("\n")}

위 룰 소스를 단위 전체에 전수 대조해 위반을 findings 로 보고. 각 발견에 category('자동'/'결정')·severity·룰 원문 인용·근거·수정안을 채울 것. 위반 없으면 findings 를 비움.`,
        { label: `review:${d.key}`, phase: "Review", schema: FINDINGS_SCHEMA },
      ).then((res) => ({ dimension: d, res })),
    ),
  )
);
// fail-fast: 차원이 하나라도 실행 실패(null)면 부분 결과로 진행하지 않고 중단(거짓 통과 방지).
assertNoFailures(reviewRaw, "Review", DIMENSIONS.map((d) => `review:${d.key}`));
const malformed = reviewRaw.filter((x) => x.res == null || !Array.isArray(x.res.findings)).map((x) => x.dimension.key);
if (malformed.length > 0) throw new Error(`[Review] 차원 결과 malformed(findings 부재): ${malformed.join(", ")} — 중단.`);
const reviewResults = reviewRaw;

// ── 비용 상한: verify fan-out 직전, 전체 에이전트 수가 Workflow 런타임 상한(1000) 근접 시 사전 throw ──
// findings 는 자르지 않는다(누락 방지). 합계가 상한 근접하면 통째 throw 로 보고.
const TOTAL_FINDINGS = reviewResults.reduce((n, x) => n + (x.res?.findings?.length ?? 0), 0);
const PLANNED_AGENTS = 1 /* plan */ + DIMENSIONS.length /* review */ + TOTAL_FINDINGS /* verify */;
const SAFE_AGENT_LIMIT = 900; // Workflow 런타임의 생애 총 에이전트 상한(1000)에 대한 안전 여유
if (PLANNED_AGENTS > SAFE_AGENT_LIMIT) {
  throw new Error(
    `findings ${TOTAL_FINDINGS}건 → 예상 에이전트 ≈ ${PLANNED_AGENTS}개로 Workflow 런타임 상한(1000) 근접. findings 를 자르면 위반이 누락되므로 리뷰 대상/차원을 좁혀 재호출하세요.`,
  );
}

// ── [Verify] 발견 항목별 적대적 검증 (배리어 통과분 일괄 fan-out) ──
phase("Verify");
const piped = await parallel(
  reviewResults.flatMap(({ dimension: d, res }) =>
    (res?.findings ?? []).map((f) => () =>
      agent(
        `${PRINCIPLES}

다음은 리뷰에서 제기된 발견 항목이다. 두 가지를 모두 적대적으로 검증하라.

[1] 발견(문제) 검증: 인용된 룰이 실제로 그렇게 규정하는지, 대상이 실제 그 위치에서 그러한지 파일을 직접 Read 하여 확인. 과장·오인·룰 오인용이면 verdict=rejected, 불명확하면 uncertain, 사실이면 confirmed. 의심스러우면 기각 쪽으로 판단. final_severity/final_category 재산정.

[2] 해결책(제안 수정) 검증: 제안된 수정을 공격적으로 따져라 —
  - 실제로 그 문제를 해결하는가,
  - 새로운 룰 위반·회귀를 만들지 않는가,
  - 엣지케이스(결측 null/undefined, 동시성/트랜잭션, soft delete 로 인한 동명 레코드 허용, 권한 분기, 타입/스키마 제약 등)에서 깨지지 않는가,
  - 과도하거나(over-engineering) 틀린 접근은 아닌가.
  대상 코드·스키마·룰을 직접 확인해 판정. 결함이 있으면 fix_verdict=flawed/risky 로 두고 fix_revised 에 교정안을 제시. 건전하면 fix_verdict=sound 로 두고 fix_revised 에 원안을 다시 기술.
  (예: "name 컬럼에 유니크 제약 추가" 같은 해결책은 soft delete 로 삭제된 동명 레코드와 충돌하므로 flawed 로 판정해야 함.)
  발견이 rejected 면 [2]는 생략 가능 — fix_verdict=uncertain, fix_revised="".

발견 항목:
- 제목: ${f.title}
- 위치: ${f.file} (${f.line})
- 심각도(제안): ${f.severity}
- 분류(제안): ${f.category}
- 위반 룰: ${f.rule}
- 근거: ${f.evidence}
- 제안 수정: ${f.fix}

리뷰 단위 경로:
${ALL_UNIT_PATHS.map((p) => "- " + p).join("\n")}

해당 파일·스키마·룰 소스를 Read 하여 직접 대조 후 판정.`,
        { label: `verify:${d.key}:${f.file}`, phase: "Verify", schema: VERDICT_SCHEMA },
      ).then((v) => ({ dimension: d.key, finding: f, verdict: v })),
    ),
  ),
);

// fail-fast: verify 에이전트가 하나라도 실패(null)면 중단.
assertNoFailures(piped, "Verify");
const all = piped;
const confirmed = all.filter((x) => x.verdict.verdict === "confirmed");
const uncertain = all.filter((x) => x.verdict.verdict === "uncertain");
const rejected = all.filter((x) => x.verdict.verdict === "rejected");

// 검증 통과분(확정+불확실)에 검증의 최종 심각도/분류를 반영
const survived = confirmed.concat(uncertain).map((x) => ({
  dimension: x.dimension,
  title: x.finding.title,
  file: x.finding.file,
  line: x.finding.line,
  severity: x.verdict.final_severity,
  category: x.verdict.verdict === "uncertain" ? "결정" : x.verdict.final_category,
  rule: x.finding.rule,
  evidence: x.finding.evidence,
  fix: x.verdict.fix_revised && x.verdict.fix_revised.trim() !== "" ? x.verdict.fix_revised : x.finding.fix,
  fix_verdict: x.verdict.fix_verdict,
  fix_assessment: x.verdict.fix_assessment,
  verdict: x.verdict.verdict,
  verifyReason: x.verdict.reason,
}));

// ── 결과 반환: 검증 통과분(survived)을 메인 루프(SKILL.md)가 병합·중복제거·[자동]/결정 분류 ──
return {
  plan: {
    units: UNITS,
    dimensions: DIMENSIONS.map((d) => ({ key: d.key, title: d.title, ruleSources: d.ruleSources })),
    notes: plan.notes,
  },
  summary: {
    units: UNITS.length,
    dimensions: DIMENSIONS.length,
    total: all.length,
    confirmed: confirmed.length,
    uncertain: uncertain.length,
    rejected: rejected.length,
    survived: survived.length,
  },
  survived,
  rejected: rejected.map((x) => ({
    dimension: x.dimension,
    title: x.finding.title,
    file: x.finding.file,
    line: x.finding.line,
    reason: x.verdict.reason,
  })),
};
