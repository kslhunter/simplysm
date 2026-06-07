export const meta = {
  name: "sd-spec-analyze",
  description:
    "Requirement Source 를 병렬 추출(map)→단일 에이전트 정합(reduce)→독립 fan-out 검증(verify)으로 분석하여 spec.md 의 §1~3 + 자연도출 §7~9 를 일괄 작성하는 분석 배치",
  phases: [
    { title: "Map", detail: "자료 multi-modal 병렬 추출(domain event/엔티티/외부시스템/규칙) + 섹션 초안 병렬 작성" },
    { title: "Reduce", detail: "단일 에이전트: §2/§3 분할(pivotal event) 결정 + 교차참조·도메인모델 정합 + spec.md write" },
    { title: "Verify", detail: "원자료 독립 재대조: 근거 좌표 실재 + 누락 역대조 + dangling 참조 grep + 자료 커버리지" },
    { title: "Downgrade", detail: "근거 위조로 판정된 항목을 spec.md 에서 [OPEN] 으로 자동 강등" },
  ],
};

// ── 입력 ───────────────────────────────────────────────────────
// args 규약 (SKILL.md 디스패처가 채워서 전달):
//   { specPath, sourcePaths[], systemName?, slug?, today, extra? }
//   - specPath:     기존 spec.md 절대경로 (없으면 신규 생성 대상 경로 — 폴더는 SKILL.md 가 만듦).
//   - sourcePaths:  Requirement Source 자료 절대경로 배열 (회의록·메일·문서·PDF·펼친 트리 등).
//   - systemName:   시스템명(spec 제목용). 미상이면 reduce 가 자료에서 도출.
//   - today:        "YYYY-MM-DD" (전역 시각 생성 금지 규약 — 호출부가 주입). §10 로그 타임스탬프에만 사용.
//   - skillDir:     이 스킬 폴더 절대경로 (SKILL.md / format-analyze.md / example-spec.md Read 용).
//   - extra:        사용자가 추가로 전달한 자유 지시(선택).
function parseArgs(raw) {
  if (raw == null) throw new Error("analyze 배치는 args(객체 또는 JSON 문자열)가 필요합니다.");
  let obj = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") throw new Error("analyze 배치 args 가 비어 있습니다.");
    try {
      obj = JSON.parse(trimmed);
    } catch {
      throw new Error("analyze 배치 args 를 JSON 으로 파싱하지 못했습니다. {specPath, sourcePaths, today, skillDir, ...} 형태로 전달하세요.");
    }
  }
  if (obj == null || typeof obj !== "object") throw new Error("analyze 배치 args 는 객체여야 합니다.");
  const specPath = obj.specPath;
  const sourcePaths = Array.isArray(obj.sourcePaths)
    ? obj.sourcePaths.filter(Boolean)
    : obj.sourcePaths
      ? [obj.sourcePaths]
      : [];
  if (!specPath) throw new Error("args.specPath (spec.md 절대경로) 가 필요합니다.");
  if (sourcePaths.length === 0) throw new Error("args.sourcePaths (Requirement Source 자료 경로) 가 1개 이상 필요합니다.");
  const skillDir = obj.skillDir;
  if (!skillDir) throw new Error("args.skillDir (이 스킬 폴더 절대경로) 가 필요합니다.");
  if (!obj.today) throw new Error("args.today (yyyy-MM-dd, §10 로그 타임스탬프용) 가 필요합니다. 디스패처가 PowerShell Get-Date 로 주입.");
  return {
    specPath,
    sourcePaths,
    systemName: obj.systemName ?? null,
    slug: obj.slug ?? null,
    today: obj.today,
    skillDir,
    extra: obj.extra ?? null,
  };
}

const INPUT = parseArgs(args);
const SKILL_MD = `${INPUT.skillDir}/SKILL.md`;
const EXAMPLE_MD = `${INPUT.skillDir}/references/example-spec.md`;
const FMT_MD = `${INPUT.skillDir}/references/format-analyze.md`;

// ── 공통 작성 원칙(모든 단계 주입) ─────────────────────────────
// §별 작성법 = format-analyze.md, 공유 형식(섹션구조·표기·참조·헤더레벨·진행방법)·골격·§10 = SKILL.md. 각 에이전트가 직접 Read 해 적용한다.
// 여기에는 그 적용 시 어겨선 안 되는 정확성·표기 원칙만 압축한다(brief §5·§6).
const PRINCIPLES = `
[작성법 출처 — 반드시 먼저 Read]
- §별 작성법·분할 절차 (§1·§2·§3·§7·§8·§9, §2 의 "분할 절차"·"분할 단위"): ${FMT_MD}
- 공유 형식 (섹션 구조/신뢰도 표기/본문 내 참조/sub-section 헤더 레벨/진행 방법)·"spec.md 골격"·§10: ${SKILL_MD}
- 형식 모범: ${EXAMPLE_MD} (필요 §만 offset/limit 로). 헤더 구조·표 형식·표기를 텍스트 규칙과 직접 대조하여 형식만 차용. 내용물(항목·컬럼·필드·동작)은 자료에서 직접 도출.

[신뢰도 표기 — 날짜 없음. 아래는 SKILL.md "신뢰도 표기" 절의 인라인 압축이며 충돌 시 SKILL.md 가 정본. example-spec.md 의 옛 [확정: 날짜]/[OPEN: 날짜] 헤더 마커는 폐기되었으니 모방 금지]
- (무표기): 사용자가 직접 말한 자명한 항목, 또는 미검토 초안. 기본 상태. 헤더에도 마커를 붙이지 않는다.
- 줄 끝 \`(근거: 출처)\`: 자료에서 해석·도출한 **비자명** 항목에만 부착. 출처는 자료 위치(예: \`(근거: 회의록.md L12)\`, \`(근거: 첨부B.pdf p.5)\`). 표는 비고 칸, 산문은 줄 끝. 사용자가 직접 말한 자명한 항목엔 붙이지 않는다.
- \`[OPEN]\`: 근거 없음(정보 부족·As-Is 만 근거·추정). 필요 시 추측·필요자료 메모 동반(예: \`[OPEN] 박스당 수량 — As-Is상 24 추정, 미확인\`). 임의로 채우거나 누락하지 말 것.
- \`[구현]\`: sd-impl 소관. 존재만 인지하고 부착·제거하지 않는다.
- \`[확정]\` 마커는 사용하지 않는다(폐기). 헤더의 \`[확정: …]\`/\`[OPEN: …]\` 날짜 마커도 전부 사용하지 않는다.

[정확성 안전장치 (brief §6 작성)]
- 비자명 항목은 inline (근거: …). 근거 없으면 [OPEN]. 환각 금지 — 자료·사용자 발언으로 인용 가능한 것만 쓴다.
- 결측 보존: "값 없음"을 ""·0·false·임의값으로 치환 금지. nullable 은 nullable 로 끝까지 전파.
- 단순화 차단: spec 명시 정의·식·분기·경계를 임의 단순화·근사·방어 처리(NULL 강제·클램프·가드·분기 생략)하지 말 것. 식은 그대로 풀어쓴다.
- silent skip 금지. 모르는 것은 추측으로 메우지 말고 [OPEN] 으로 표기.

[자율 — 사용자에게 묻지 않는다]
- 실행 중 사용자에게 질문하지 않는다. 판단이 안 서는 지점은 [OPEN] + 메모로 남긴다.

[본문 내 참조 — 이름 기반. SKILL.md "본문 내 참조" 절의 인라인 압축이며 충돌 시 SKILL.md 가 정본]
- 다른 섹션 참조는 § 번호 대신 \`[카테고리.이름]\` (예: [화면.재고 확인], [프로세스.입고], [모델.재고], [공통 정의.Location 라벨]). 다단 표기 가능.
- §2~§9 본문에 \`관련 섹션: [카테고리.이름], ...\` 한 줄로 참조·의존 섹션을 콤마 나열.
`;

// ── fail-fast 가드 ─────────────────────────────────────────────
// parallel 배리어 직후 호출. 결과에 null(에이전트 reject/스킵)이 하나라도 있으면
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

// map-A: 자료별 multi-modal 객관 추출(좌표 포함). 분석/판단 전의 원사실 인벤토리.
const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sourcePath", "domainEvents", "entities", "externalSystems", "rules", "actors", "openGaps"],
  properties: {
    sourcePath: { type: "string", description: "추출 대상 자료 경로" },
    domainEvents: {
      type: "array",
      description: "동사 과거형 사건(Event Storming chaotic events). 원본 구조 무관, 평면 추출.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["event", "locator", "verbatim"],
        properties: {
          event: { type: "string", description: "동사 과거형 사건 한 줄(예: '박스가 입고 등록되었다')" },
          locator: { type: "string", description: "자료 내 위치 좌표(예: '회의록.md L12', '첨부B.pdf p.5')" },
          verbatim: { type: "string", description: "근거가 된 원문 인용 1~2줄" },
        },
      },
    },
    entities: {
      type: "array",
      description: "도메인 엔티티 후보(명사 — 마스터/트랜잭션 데이터).",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["entity", "fields", "locator"],
        properties: {
          entity: { type: "string", description: "엔티티명(도메인 어휘)" },
          fields: { type: "array", items: { type: "string" }, description: "언급된 필드·속성(있는 것만)" },
          locator: { type: "string", description: "자료 내 위치 좌표" },
        },
      },
    },
    externalSystems: {
      type: "array",
      description: "외부 시스템·거래처·외부 채널(협상 필요한 인터페이스 후보 + 표준 채널 후보).",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["system", "interaction", "locator"],
        properties: {
          system: { type: "string", description: "외부 시스템·관계자명(예: ERP, 화주, 거래처 EDI)" },
          interaction: { type: "string", description: "상호작용 요약(방향·자료·채널)" },
          locator: { type: "string", description: "자료 내 위치 좌표" },
        },
      },
    },
    rules: {
      type: "array",
      description: "도메인 룰·계산식·분기·제약·정책·가드레일(지나가는 말 포함). 단순화 없이 원문 그대로.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rule", "locator", "verbatim"],
        properties: {
          rule: { type: "string", description: "룰·식·제약 한 줄(식은 그대로 풀어씀)" },
          locator: { type: "string", description: "자료 내 위치 좌표" },
          verbatim: { type: "string", description: "근거 원문 인용 1~2줄" },
        },
      },
    },
    actors: {
      type: "array",
      description: "최종 사용자·이해관계자 역할(개인 이름 금지 — 역할로 일반화).",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["role", "locator"],
        properties: {
          role: { type: "string", description: "역할(예: 창고 작업자, 창고 관리자)" },
          locator: { type: "string", description: "자료 내 위치 좌표" },
        },
      },
    },
    openGaps: {
      type: "array",
      description: "자료상 모호·누락·As-Is 만 근거인 지점(→ [OPEN] 후보). 추측·필요자료 메모.",
      items: { type: "string" },
    },
  },
};

// map-B: 추출 인벤토리를 바탕으로 한 섹션군의 초안 markdown 작성.
const SECTION_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sectionKey", "markdown", "crossRefs", "openItems", "evidenceUsed"],
  properties: {
    sectionKey: { type: "string", description: "작성한 섹션군 키(예: 's1', 's2s3', 's7', 's8', 's9')" },
    markdown: { type: "string", description: "해당 섹션군의 spec.md 본문 markdown(헤더 포함, 마커 규약 준수)" },
    crossRefs: {
      type: "array",
      description: "이 섹션이 사용한 이름 기반 참조 전체([카테고리.이름])",
      items: { type: "string" },
    },
    openItems: { type: "array", description: "이 섹션에 남긴 [OPEN] 항목 요약", items: { type: "string" } },
    evidenceUsed: {
      type: "array",
      description: "이 섹션이 근거로 인용한 (좌표) 목록",
      items: { type: "string" },
    },
  },
};

// reduce: 단일 에이전트가 분할 결정 + 정합 + spec.md 한 번에 write.
const REDUCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["systemName", "written", "sectionIndex", "evidenceClaims", "crossRefs", "openItems", "decisionLog"],
  properties: {
    systemName: { type: "string", description: "확정한 시스템명(spec 제목)" },
    written: { type: "boolean", description: "spec.md 를 실제로 Write 했는지" },
    sectionIndex: {
      type: "array",
      description: "작성된 §x.x 헤더 인덱스(이름 기반 참조 대상 실재 확인용)",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ref", "heading"],
        properties: {
          ref: { type: "string", description: "이름 기반 참조 토큰(예: '[화면.재고 확인]' / '[모델.재고]')" },
          heading: { type: "string", description: "대응하는 §x.x 헤더 텍스트" },
        },
      },
    },
    evidenceClaims: {
      type: "array",
      description: "spec.md 본문에 부착한 모든 (근거: 출처) 좌표 1:1 목록(verify 가 재대조).",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "locator", "sourcePath"],
        properties: {
          claim: { type: "string", description: "근거가 부착된 항목·문장 요약" },
          locator: { type: "string", description: "부착한 좌표(예: '회의록.md L12')" },
          sourcePath: { type: "string", description: "좌표가 가리키는 자료 경로" },
        },
      },
    },
    crossRefs: { type: "array", description: "본문에 등장하는 모든 이름 기반 참조 토큰(중복 포함)", items: { type: "string" } },
    openItems: { type: "array", description: "spec 전체의 [OPEN] 항목 요약", items: { type: "string" } },
    decisionLog: {
      type: "array",
      description: "§2/§3 분할 등 비자명 판단 근거(reduce 가 내린 결정과 그 pivotal event)",
      items: { type: "string" },
    },
  },
};

// verify-A: 근거 좌표 1:1 실재 대조(자료를 독립 컨텍스트에서 다시 열어 검증).
const EVIDENCE_VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["claim", "locator", "status", "found", "reason"],
  properties: {
    claim: { type: "string" },
    locator: { type: "string" },
    status: {
      type: "string",
      enum: ["match", "mismatch", "unreachable"],
      description: "match=좌표가 실제로 그 내용을 담음 / mismatch=근거 위조(내용 불일치) / unreachable=좌표·자료에 접근 불가",
    },
    found: { type: "string", description: "그 좌표에서 실제로 읽은 내용 요약" },
    reason: { type: "string", description: "판정 근거" },
  },
};

// verify-B: 원자료 ↔ spec 전수 대조로 누락 보고 + 자료 커버리지.
const COVERAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sourcePath", "missing", "uncovered"],
  properties: {
    sourcePath: { type: "string" },
    missing: {
      type: "array",
      description: "자료에 있으나 spec 에 누락된 요구·룰·엔티티·외부시스템(있으면 보고).",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item", "locator", "kind"],
        properties: {
          item: { type: "string", description: "누락 항목 요약" },
          locator: { type: "string", description: "자료 내 위치 좌표" },
          kind: { type: "string", description: "분류(event/entity/external/rule/actor/etc)" },
        },
      },
    },
    uncovered: {
      type: "array",
      description: "spec 에 반영되지 않은 자료 영역(자료 커버리지 — 미반영 부분).",
      items: { type: "string" },
    },
  },
};

// verify-C: dangling 참조 grep(이름 기반 참조가 실존 §를 가리키는지).
const DANGLING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dangling", "checked"],
  properties: {
    dangling: {
      type: "array",
      description: "spec.md 에 실존 §가 없는(끊긴) 이름 기반 참조 토큰.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ref", "where", "reason"],
        properties: {
          ref: { type: "string", description: "끊긴 참조 토큰(예: '[화면.없는화면]')" },
          where: { type: "string", description: "참조가 등장한 위치(섹션)" },
          reason: { type: "string", description: "왜 끊겼는지(대응 헤더 없음 등)" },
        },
      },
    },
    checked: { type: "number", description: "검사한 참조 토큰 수" },
  },
};

// ── [Map] 자료 병렬 추출 → 추출 인벤토리 기반 섹션 병렬 작성 ────
phase("Map");

// map-1: 자료별 multi-modal 객관 추출(자료가 많으면 폭이 커지고 적으면 작음 — 규모 무관).
const extractions = await parallel(
  INPUT.sourcePaths.map((src) => () =>
    agent(
      `${PRINCIPLES}

[Map 1단계 — 자료 객관 추출] 대상 자료: ${src}

이 자료 1건을 끝까지 Read(PDF·펼친 트리 등 형식 불문)하고, 분석·판단 이전의 **원사실 인벤토리**를 multi-modal 로 평면 추출하라:
- domain event: 동사 과거형 사건 전부(Event Storming "chaotic events"). 원본 구조(메일·슬라이드)와 무관하게 평면적으로.
- entities: 도메인 엔티티 후보(명사)와 언급된 필드.
- externalSystems: 외부 시스템·거래처·외부 채널.
- rules: 도메인 룰·계산식·분기·제약·정책·가드레일(지나가듯 한 말 포함). **단순화 없이** 원문 그대로.
- actors: 역할(개인 이름 금지).
- openGaps: 모호·누락·As-Is 만 근거인 지점.

모든 항목에 자료 내 위치 좌표(locator)와 원문 인용(verbatim, 해당 필드 있는 경우)을 반드시 채워라 — 이후 검증이 이 좌표를 1:1 재대조한다. 좌표 없는 추측 금지.${INPUT.extra ? `\n\n[사용자 추가 지시]\n${INPUT.extra}` : ""}`,
      { label: `extract:${src}`, phase: "Map", schema: EXTRACT_SCHEMA },
    ),
  ),
);

assertNoFailures(extractions, "Map/extract", INPUT.sourcePaths.map((p) => `extract:${p}`));
const validExtractions = extractions;

const EXTRACT_DIGEST = JSON.stringify(validExtractions, null, 2);
log(
  `자료 ${validExtractions.length}건 추출: event ${validExtractions.reduce((a, e) => a + (e.domainEvents?.length ?? 0), 0)}, entity ${validExtractions.reduce((a, e) => a + (e.entities?.length ?? 0), 0)}, external ${validExtractions.reduce((a, e) => a + (e.externalSystems?.length ?? 0), 0)}, rule ${validExtractions.reduce((a, e) => a + (e.rules?.length ?? 0), 0)}`,
);

// map-2: 추출 인벤토리 기반 섹션군 병렬 초안 작성.
// 분석 배치 산출 = §1~3 + 자연도출 §7~9. (§2/§3 의 최종 분할은 reduce 가 pivotal event 로 확정하므로,
//  여기서는 각 섹션군이 자기 영역 초안을 병렬로 작성하고 reduce 가 정합·재배치한다.)
const SECTION_TASKS = [
  {
    key: "s2s3",
    title: "§2 업무 프로세스 + §3 기타 요구사항 (분할 + 본문 초안)",
    detail:
      "추출 인벤토리의 domain event 를 timeline 정렬 → pivotal event(start/end/도메인 전환점) 식별 → bounded subdomain 그룹화하여 §2.x(사이클)/§3.x(단일 user goal)/미분류 로 분류하라(§2 '분할 절차'·'분할 단위'·'분할 결과 매핑'). " +
      "§2.x 본문 = BPMN(mermaid fence; 노드=액션/트랜잭션 1행 동사구, 의사결정 분기만, <br/> 금지) + 흐름 설명 bullet(룰·조건·식·외부약속·자료출처) + 관련 섹션 한 줄. " +
      "§3.x 본문 = 요구 의도 + 관련 섹션 한 줄. 시스템 전반 자동 룰·프레임워크 운영 기반도 §3 에 포함(설계는 §6 소관 — 여기선 인지만). 헤더 명칭은 외부 관계자 평면 기반 도메인 동사구(시스템/문서/메뉴/양식 명칭 금지).",
  },
  {
    key: "s1",
    title: "§1 개요 (1.1 핵심 목적 / 1.2 주요 목표 / 1.3 최종 사용자·이해관계자 / 1.4 환경·장치)",
    detail:
      "pivotal event 도출로 나온 외부 관계자 평면 + actors + entities 를 도메인 관계도로 보고 작성(§1). " +
      "1.1=한 줄 동사형 큰 단위(동사구 나열 금지). 1.2=최종 사용자 업무 흐름 1건씩 한 줄 동사구(§2 헤더와 1:1 경향, 임의 축약·누락 금지). 1.3=역할로 일반화(개인 이름 금지). " +
      "1.4=ASCII 구성도(솔루션 노드+연결선+물리위치그룹+자동연동 외부시스템; Actor·외부 관계자(인적·조직)·수동채널·제품명·프로토콜·사양 제외) + 장치 목록(OS·버전·제품·모델·해상도) 각각 독립 작성. 자료에 없는 환경·장치는 [OPEN].",
  },
  {
    key: "s8",
    title: "§8 도메인 모델",
    detail:
      "entities 인벤토리에서 엔티티별로 작성(§8). 섹션 구조 = '필드:' 표(필드|타입|필수|비고) + '키/제약:' 불릿. " +
      "모든 엔티티에 ID(숫자,자동부여) 식별 키 명시. 비즈니스 키(코드 등)는 별도 명시(수정 가능). 활성/비활성 boolean=소프트 삭제 플래그(§7.1 용어 사전에 한 줄 명문화 필요 메모). " +
      "비고에는 그 필드가 무엇인지(형식·값범위·의미·제약·예시)만 — 용도·외부 매핑은 적지 않음. 근거 없는 필드는 [OPEN].",
  },
  {
    key: "s9",
    title: "§9 외부 인터페이스",
    detail:
      "externalSystems 중 **상대 시스템 고유의 협상 필요 인터페이스만** §9 로(§9 '정의'). 표준 프로토콜·채널(메일 SMTP/IMAP/Graph·FTP·표준 OAuth)은 §9 아님 → §5 자동 처리 소관이므로 여기서 제외하고 메모로만 남김. " +
      "§9.x 본문 = 기본 정보(상대 시스템/방향/전송 방식) + 관련 섹션 한 줄 + 자료 매핑 표(상대 필드↔본 시스템 출처) + 예외 처리. 도메인 약속 레벨까지만(endpoint·method·인증 흐름 등 구현 디테일 제외).",
  },
  {
    key: "s7",
    title: "§7 공통 정의 (7.1 용어 사전 + 7.2~ 기타 공통 규격 / 외부 자료 명세)",
    detail:
      "도메인 어휘·약어·시스템 규격을 작성(§7). 7.1=용어 사전. 7.2~=시스템 전반 규격(바코드 형식·라벨·공통 정책). " +
      "외부 자료 명세 = 시스템 외부에서 정의되어 도메인 모델로 자명하지 않은 자료(외부 송신 파일·거래처 표준 양식)만 — 자료별 컬럼 표 필수, 모든 컬럼 1행 1정의, '설명/규칙'엔 데이터 정의만(용도 금지). " +
      "도메인 모델의 자체 엑셀 양식은 §7 아님. 특정 §2/§3 본문에 속하는 해석 규칙은 §7 에 두지 않음. 근거 없는 셀은 [OPEN].",
  },
];

const sectionDrafts = await parallel(
  SECTION_TASKS.map((t) => () =>
    agent(
      `${PRINCIPLES}

[Map 2단계 — 섹션 초안 작성] 작성 대상 섹션군: ${t.title}

먼저 ${FMT_MD} 에서 이 섹션군의 §별 작성법을, ${SKILL_MD} 에서 "spec.md 형식"(섹션 구조/신뢰도 표기/본문 내 참조/sub-section 헤더 레벨)을 Read 하고, ${EXAMPLE_MD} 에서 해당 §의 형식 모범을 offset/limit 로 Read 하여 헤더 구조·표 형식을 직접 대조하라(모범 Read 없이 텍스트 규칙만으로 작성 금지). 단, 모범의 [구현] 마커는 sd-impl 소관이라 모방하지 말 것(신뢰도 표기는 위 신뢰도 표기 규약을 따름).

작성 지침: ${t.detail}

아래는 모든 자료의 객관 추출 인벤토리(좌표 포함)다. 이 인벤토리와 자료 원문만을 내용 출처로 삼아 초안을 작성하라(다른 § 패턴 복제로 내용물 채우기 금지). 좌표가 필요하면 해당 자료를 직접 Read 해 확인하라.
<extractions>
${EXTRACT_DIGEST}
</extractions>

산출: 이 섹션군의 spec.md 본문 markdown(헤더 포함). 비자명 항목엔 줄 끝 (근거: 좌표), 근거 없으면 [OPEN], 결측 보존, 단순화 금지. 사용한 이름 기반 참조(crossRefs)·남긴 [OPEN](openItems)·인용한 근거 좌표(evidenceUsed)도 함께 반환. sectionKey="${t.key}".`,
      { label: `draft:${t.key}`, phase: "Map", schema: SECTION_DRAFT_SCHEMA },
    ),
  ),
);

assertNoFailures(sectionDrafts, "Map/draft", SECTION_TASKS.map((t) => `draft:${t.key}`));
const validDrafts = sectionDrafts;
const missingDraftKeys = SECTION_TASKS.filter((t) => !validDrafts.some((d) => d.sectionKey === t.key)).map((t) => t.key);
if (missingDraftKeys.length > 0) throw new Error(`[Map/draft] 섹션군 결과 누락(sectionKey 불일치): ${missingDraftKeys.join(", ")} — 중단.`);
log(`섹션 초안 ${validDrafts.length}/${SECTION_TASKS.length}군 작성`);

// ── [Reduce] 단일 에이전트: 분할 확정 + 정합 + spec.md write ────
phase("Reduce");

const DRAFT_DIGEST = JSON.stringify(
  validDrafts.map((d) => ({ sectionKey: d.sectionKey, markdown: d.markdown, crossRefs: d.crossRefs, openItems: d.openItems })),
  null,
  2,
);
const reduceResult = await agent(
  `${PRINCIPLES}

[Reduce — 단일 정합 에이전트] 너는 병렬 초안을 하나의 spec.md 로 통합·정합하는 **유일한** 에이전트다(일관성 결정은 항상 단일 에이전트). 사용자에게 묻지 말고 자율 결정하되, 판단 불가 지점은 [OPEN] 으로 남겨라.

먼저 ${SKILL_MD} 의 "spec.md 골격", "spec.md 형식"(섹션 구조/신뢰도 표기/본문 내 참조/sub-section 헤더 레벨)을, ${FMT_MD} 의 §2 "분할 절차"·"분할 단위"를 Read 하라. ${EXAMPLE_MD} 의 전체 구성도 형식 모범으로 참조(단 [구현] 마커는 sd-impl 소관 — 모방 금지).

입력 1) 자료 객관 추출 인벤토리:
<extractions>
${EXTRACT_DIGEST}
</extractions>

입력 2) 섹션군 병렬 초안:
<drafts>
${DRAFT_DIGEST}
</drafts>

네 일:
1. **§2/§3 분할 확정**: s2s3 초안의 분류를 pivotal event(start/end/도메인 어휘 전환점) 기준으로 최종 확정. 사이클(multi-event handoff 포함)→§2.x, 단일 user goal→§3.x. handoff 는 §2.x 분리 사유가 아님. 비자명 분할 판단은 decisionLog 에 근거와 함께 기록.
2. **도메인 모델 정합**: §8 엔티티들이 §2/§3/§4(미래)·§9 에서 쓰일 참조와 어긋나지 않게 필드·키·참조 방향을 통일. 중복 엔티티 병합, 누락 엔티티 추가.
3. **교차참조 정합**: 모든 \`관련 섹션:\` 줄과 본문 내 \`[카테고리.이름]\` 참조가 실존 §x.x 를 가리키도록 이름을 통일(이름 기반 표기). §4/§5/§6 는 이 분석 배치 산출 범위 밖이지만, §2/§3 가 그 화면·자동 처리·기반을 \`[화면.X]\`·\`[자동 처리.X]\`·\`[기반.X]\` 로 **참조**하는 것은 정상이며 유지(설계 배치가 채움). 단 §1~3·§7~9 **내부**의 참조는 실존하도록 정합.
4. **spec.md 골격 + §1~3 + §7~9 write**: 골격(§1~§10 헤더)을 갖추고 §1~3·§7~9 본문을 채워 ${INPUT.specPath} 에 **한 번에 Write**. §4·§5·§6 은 헤더만 두고 본문은 비움(설계 배치 대상). §10 "본문 외 확정 사항"은 분석 중 도출된 제외·진행방법·부정 결정이 있으면 \`- ${INPUT.today}: ...\` 로그 형식으로 기록(없으면 헤더만). §10 로그 외에는 어떤 날짜 마커도 쓰지 말 것.
   - 시스템명: ${INPUT.systemName ? `"${INPUT.systemName}"` : "자료에서 도출(미상이면 가장 적합한 도메인명)"}. 제목 = "<시스템명> 요구 분석서".
5. 반환: written(Write 성공 여부), sectionIndex(작성된 모든 §x.x 헤더 ↔ 이름 기반 참조 토큰), evidenceClaims(본문에 부착한 모든 (근거: 좌표) 1:1 목록 — verify 가 재대조함), crossRefs(본문 등장 모든 참조 토큰), openItems, decisionLog.

기존 ${INPUT.specPath} 가 있으면 먼저 Read 하여 이미 확정된 본문·§10 로그를 보존하고 분석 산출(§1~3·§7~9)만 갱신/보강하라(무관 섹션 일괄치환 금지).`,
  { label: "reduce", phase: "Reduce", schema: REDUCE_SCHEMA },
);

if (!reduceResult?.written) {
  throw new Error("Reduce 단계가 spec.md 를 Write 하지 못했습니다. " + (reduceResult?.systemName ?? ""));
}
log(
  `Reduce: spec.md write 완료 — §x.x ${reduceResult.sectionIndex?.length ?? 0}개, 근거 claim ${reduceResult.evidenceClaims?.length ?? 0}개, OPEN ${reduceResult.openItems?.length ?? 0}개`,
);

// ── [Verify] 독립 fan-out 검증 (brief §6) ──────────────────────
phase("Verify");

const evidenceClaims = (reduceResult.evidenceClaims ?? []).filter((c) => c && c.locator);
const sectionRefs = (reduceResult.sectionIndex ?? []).map((s) => s.ref).filter(Boolean);

// verify-A: 근거 좌표 1:1 실재 대조(자료를 독립 컨텍스트에서 다시 열어, 1 claim = 1 agent fan-out).
const evidencePromise = parallel(
  evidenceClaims.map((c) => () =>
    agent(
      `[Verify A — 근거 좌표 실재 대조] 너는 spec.md 의 한 (근거:…) 표기가 위조가 아닌지 **원자료를 독립적으로 다시 열어** 1:1 검증한다.

근거가 부착된 항목: ${c.claim}
주장된 좌표: ${c.locator}
가리키는 자료: ${c.sourcePath}

그 자료(${c.sourcePath})를 직접 Read 하여 해당 좌표 위치를 확인하라. 그 위치가 실제로 이 항목의 근거가 되는 내용을 담고 있으면 status="match", 좌표는 닿지만 내용이 다르면(근거 위조) status="mismatch", 자료·좌표에 접근 불가하면 status="unreachable". found 에 실제 읽은 내용을, reason 에 판정 근거를 적어라. 의심스러우면 mismatch 쪽으로.`,
      { label: `verify-evidence:${c.locator}`, phase: "Verify", schema: EVIDENCE_VERDICT_SCHEMA },
    ),
  ),
);

// verify-B: 원자료 ↔ spec 전수 대조 누락 + 자료 커버리지(자료 1건 = 1 agent fan-out).
const coveragePromise = parallel(
  INPUT.sourcePaths.map((src) => () =>
    agent(
      `${PRINCIPLES}

[Verify B — 누락 역대조 + 자료 커버리지] 너는 한 원자료를 **독립적으로 다시 열어** spec.md(${INPUT.specPath}) 와 전수 대조한다.

자료: ${src}

그 자료를 끝까지 Read 하고 ${INPUT.specPath} 도 Read 하라. 그 다음:
- missing: 자료에 있는 요구·룰·계산식·엔티티·외부 시스템·actor 중 spec(§1~3·§7~9) 에 **누락된** 것을 좌표와 함께 보고. (단 §4·§5·§6 영역의 설계 디테일은 분석 배치 산출 범위 밖이므로 누락으로 치지 않는다 — 분석 영역인 §1~3·§7~9 기준으로 판정.)
- uncovered: 이 자료 중 spec 에 전혀 반영되지 않은 영역(자료 커버리지 보고).

추측 금지 — 자료 좌표로 가리킬 수 있는 누락만 보고.`,
      { label: `verify-coverage:${src}`, phase: "Verify", schema: COVERAGE_SCHEMA },
    ),
  ),
);

// verify-C: dangling 참조 grep(이름 기반 참조 ↔ 실존 § 1건 검사).
const danglingPromise = agent(
  `[Verify C — dangling 참조 검사] spec.md(${INPUT.specPath}) 의 모든 이름 기반 참조(\`[카테고리.이름]\`: [화면.X]·[모델.X]·[프로세스.X]·[기타.X]·[자동 처리.X]·[기반.X]·[외부 인터페이스.X]·[공통 정의.X] 등)가 실존하는 §x.x 헤더를 가리키는지 검사하라.

방법: ${INPUT.specPath} 를 Read 하고, Grep 으로 모든 \`[…]\` 참조 토큰을 수집한 뒤, 각 토큰이 대응하는 §x.x 헤더(또는 §8 모델·§7 공통 정의 헤더)를 실제로 가지는지 대조하라.

주의: §4/§5/§6(화면·자동 처리·공통·기반)은 이 분석 배치에서 헤더만 있고 본문이 비어 있을 수 있다. §2/§3 가 \`[화면.X]\`·[자동 처리.X]·[기반.X] 로 그 영역을 참조하는 것은 **설계 배치가 채울 예정인 정상 참조**이므로 dangling 으로 보고하지 말 것. 오직 §1~3·§7~9 **내부**에서 실존하지 않는 대상을 가리키는 참조만 dangling 으로 보고하라.

참고 — reduce 가 보고한 작성 §x.x 인덱스:
${sectionRefs.map((r) => "- " + r).join("\n") || "- (없음)"}

dangling(끊긴 참조 토큰 목록)과 checked(검사한 토큰 수)를 반환.`,
  { label: "verify-dangling", phase: "Verify", schema: DANGLING_SCHEMA },
);

const [evidenceVerdicts, coverageReports, danglingReport] = await Promise.all([
  evidencePromise,
  coveragePromise,
  danglingPromise,
]);

assertNoFailures(evidenceVerdicts, "Verify/evidence", evidenceClaims.map((c) => `verify-evidence:${c.locator}`));
assertNoFailures(coverageReports, "Verify/coverage", INPUT.sourcePaths.map((src) => `verify-coverage:${src}`));
if (!danglingReport) throw new Error("[Verify/dangling] dangling 검사 에이전트 실행 실패(null) — 중단.");
const evRes = evidenceVerdicts;
const forged = evRes.filter((v) => v.status === "mismatch");
const unreachable = evRes.filter((v) => v.status === "unreachable");
const covRes = coverageReports;
const allMissing = covRes.flatMap((c) => (c.missing ?? []).map((m) => ({ ...m, sourcePath: c.sourcePath })));
const allUncovered = covRes.flatMap((c) => (c.uncovered ?? []).map((u) => ({ uncovered: u, sourcePath: c.sourcePath })));
const dangling = (danglingReport.dangling ?? []).filter(Boolean);

log(
  `Verify: 근거 위조 ${forged.length} / 접근불가 ${unreachable.length} / 누락 ${allMissing.length} / 미반영 영역 ${allUncovered.length} / dangling ${dangling.length}`,
);

// ── [Downgrade] 근거 위조 자동 [OPEN] 강등 (사용자 결정: 자동 강등) ──
// reduce 가 이미 spec.md 를 write 했으므로, verify 가 위조(mismatch)로 판정한 (근거:…) 항목을
// spec.md 에서 [OPEN] 으로 내린다. 강등은 비파괴적(원 좌표를 메모로 보존) — 오탐이면 사용자가 부분 수정으로 되돌린다.
const DOWNGRADE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["demoted", "summary"],
  properties: {
    demoted: { type: "array", items: { type: "string" }, description: "실제 [OPEN] 으로 강등한 항목 목록" },
    summary: { type: "string", description: "강등 결과 요약" },
  },
};

let demoted = [];
if (forged.length > 0) {
  phase("Downgrade");
  const dg = await agent(
    `[Downgrade — 근거 위조 [OPEN] 강등] spec.md(${INPUT.specPath})를 Read 하고, 아래 '근거 위조'로 판정된 항목들의 \`(근거: 좌표)\` 표기를 제거하고 \`[OPEN]\` 으로 강등하라(비파괴적: 원 좌표를 메모로 보존 — 예: \`[OPEN] <항목> — 근거 위조 의심(주장좌표: <좌표>), 재확인 필요\`).

강등 대상:
${forged.map((v) => `- ${v.claim} (주장좌표: ${v.locator} / 불일치: ${v.reason})`).join("\n")}

방법: 각 항목을 Edit 으로 그 \`(근거: …)\` 부분만 정확히 치환(무관 본문·다른 섹션 보존, 일괄 치환 금지). 항목 내용 자체는 유지하고 근거 표기만 [OPEN] 으로 바꾼다. 실제 강등한 항목 목록(demoted)과 요약(summary)을 반환.`,
    { label: "downgrade", phase: "Downgrade", schema: DOWNGRADE_SCHEMA },
  );
  demoted = dg?.demoted ?? [];
  log(`강등: 근거 위조 ${demoted.length}건 [OPEN] 처리`);
}

// ── 결과 반환: 검토 패키지(SKILL.md 가 사용자에게 정지·제시) ────
// brief §4: 각 연산 후 spec.md 갱신 + 검토 패키지 → 정지. 자동으로 설계 배치로 넘어가지 않음.
// 근거 위조(mismatch)는 위 Downgrade 단계에서 [OPEN] 으로 자동 강등됨(비파괴적). 사용자는 검토 패키지로 확인하고, 오탐이면 부분 수정으로 되돌린다.
return {
  operation: "analyze",
  specPath: INPUT.specPath,
  systemName: reduceResult.systemName,
  written: reduceResult.written,
  demoted,
  topology: "map(자료 병렬 추출 + 섹션 병렬 작성) → reduce(단일: 분할·정합·write) → verify(근거 좌표 실재 + 누락 역대조 + dangling grep, fan-out) → downgrade(근거 위조 [OPEN] 자동 강등)",
  sections: {
    index: reduceResult.sectionIndex ?? [],
    decisionLog: reduceResult.decisionLog ?? [],
    openItems: reduceResult.openItems ?? [],
  },
  verify: {
    evidence: {
      total: evRes.length,
      matched: evRes.filter((v) => v.status === "match").length,
      forged: forged.map((v) => ({ claim: v.claim, locator: v.locator, found: v.found, reason: v.reason, action: "[OPEN] 강등 완료" })),
      unreachable: unreachable.map((v) => ({ claim: v.claim, locator: v.locator, reason: v.reason })),
    },
    coverage: {
      missing: allMissing,
      uncovered: allUncovered,
    },
    dangling,
  },
  reviewPackageNote:
    "SKILL.md 가 이 결과로 검토 패키지를 구성해 사용자에게 제시하고 정지한다(쓴 섹션 요약 + [OPEN] 목록 + 강등 항목 + verify 결과 + 자료 커버리지). 워크플로는 fail-fast — 에이전트가 하나라도 실패하면 부분 결과 없이 throw 하므로, 정상 반환되면 전 자료 추출·전 섹션 작성·전 검증이 완료된 것이다(에러로 끝나면 resume 로 재실행). 근거 위조는 [OPEN] 으로 자동 강등됨 — 오탐이면 사용자가 부분 수정으로 되돌린다. dangling·누락은 사용자 검토 후 부분 수정으로 교정. 분석이 끝나도 설계 배치로 자동 진입하지 않는다.",
};
