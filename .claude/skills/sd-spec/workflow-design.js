export const meta = {
  name: "sd-spec-design",
  description:
    "확정된 §1~3 을 입력으로 §4 화면·§5 자동 처리·§6 공통·기반 기능을 도출·작성하고, 교차참조 정합·역대조 검증 후 spec.md 에 반영하는 설계 배치",
  phases: [
    { title: "Read", detail: "spec.md + format-design.md §별 작성법 로딩, 확정 §1~3(+§7~9) 추출" },
    { title: "Derive", detail: "§4/§5/§6 헤더 분할 도출 (단일 에이전트)" },
    { title: "Map", detail: "§4 화면 / §5 자동 처리 / §6 공통·기반 본문 병렬 작성" },
    { title: "Reduce", detail: "화면 목록 표·모달/시트 재활용 교차참조 정합 (단일 에이전트)" },
    { title: "Verify", detail: "근거 1:1 대조 · §1~3 요구목록→§4~6 역대조 · dangling 참조 · 커버리지 (병렬)" },
    { title: "Write", detail: "§4~6 본문을 spec.md 에 반영" },
  ],
};

// ── 입력 ───────────────────────────────────────────────────────
// args: spec.md 경로 문자열. (객체 {specPath} 도 허용)
if (args == null || (typeof args === "string" && args.trim() === "")) {
  throw new Error("설계 대상 spec.md 경로를 args 로 전달하세요.");
}
const SPEC_PATH =
  typeof args === "string"
    ? args.trim()
    : (args.specPath ?? args.spec ?? args.path ?? "").toString().trim();
if (SPEC_PATH === "") throw new Error("args 에서 spec.md 경로를 찾지 못했습니다.");

const SKILL_DIR = String((typeof args === "object" && args && args.skillDir) || "").replace(/[\/\\]+$/, "");
if (SKILL_DIR === "") throw new Error("args.skillDir (이 스킬 폴더 절대경로) 가 필요합니다.");
const SKILL_PATH = `${SKILL_DIR}/SKILL.md`;
const EXAMPLE_PATH = `${SKILL_DIR}/references/example-spec.md`;
const DESIGN_FMT = `${SKILL_DIR}/references/format-design.md`;
const ANALYZE_FMT = `${SKILL_DIR}/references/format-analyze.md`;

// ── 공통 원칙(모든 단계 주입) ──────────────────────────────────
// 설계 배치는 자율 실행 — 실행 중 사용자에게 묻지 않음. 모르는 건 [OPEN].
const PRINCIPLES = `
대상 spec.md: ${SPEC_PATH}

설계 배치 공통 원칙(자율·정확성):
- 자율 실행. 실행 중 사용자에게 질문하지 말 것. 결정할 근거가 없으면 임의로 채우지 말고 [OPEN] 으로 표기(필요 시 추측·필요자료 메모 동반).
- 결측 보존: "값 없음"(null/undefined/미상)을 ""/0/false/임의값으로 치환 금지.
- 단순화 차단: spec 명시 정의·식·분기·경계를 임의로 단순화·근사화·방어 처리(NULL 강제·0 클램프·가드)하지 말 것. 식은 그대로 풀어쓸 것.
- 불필요한 래핑·추상화 금지: 단순 입력은 그대로 전달.

신뢰도 마커(전부 날짜 없음. 아래는 SKILL.md "신뢰도 표기" 절의 인라인 압축이며 충돌 시 SKILL.md 가 정본):
- (무표기): 직접·자명, 또는 미검토 초안. 기본 상태.
- 줄끝 \`(근거: 출처)\`: 자료에서 해석·도출한 **비자명** 항목에만 근거를 부착. 사용자가 직접 말한 자명한 항목엔 붙이지 않음. 표는 비고 칸, 산문은 줄 끝.
- \`[OPEN]\`: 근거 없음. As-Is(현행 화면·매뉴얼)만 근거이거나 답변 범위 흡수 = 근거 없음 → [OPEN]. 필요 시 추측·필요자료 메모 동반(예: \`[OPEN] A4 1매당 그리드 행/열 — 미확인\`).
- \`[구현]\`: sd-impl 소관. 존재만 인지, 부착·제거하지 않음.
- \`[확정]\` 마커는 폐기(사용하지 않음). 화면 헤더는 \`### N.N 화면명 (PC)\` / \`(PDA)\` 형식(장치 표기만 유지, 날짜 마커 없음).

본문 내 참조(이름 기반. SKILL.md "본문 내 참조" 절의 인라인 압축이며 충돌 시 SKILL.md 가 정본): 다른 섹션은 § 번호 대신 \`[카테고리.이름]\` 형식으로 참조.
- 예: \`[모델.재고]\`·\`[화면.재고 확인]\`·\`[프로세스.입고]\`·\`[기타.과거 재고 조회]\`·\`[자동 처리.재고 스냅샷]\`·\`[기반.앱 구조 정의]\`·\`[외부 인터페이스.ERP 입고 통보]\`·\`[공통 정의.Location 라벨]\`.
- \`관련 섹션: [카테고리.이름], ...\` 한 줄로 참조·의존 섹션 나열.

형식 권위: §4~6 작성법은 반드시 ${DESIGN_FMT} 를 Read 해 따른다(텍스트 규칙만으로 추정 금지). 공유 형식(섹션 구조·신뢰도 표기·본문 내 참조·sub-section 헤더 레벨)은 ${SKILL_PATH}, §7~9 를 보강할 때의 작성법은 ${ANALYZE_FMT}. 가장 가까운 모범은 ${EXAMPLE_PATH} 의 해당 § 를 Read 해 헤더 구조·표 형식을 직접 대조([구현] 마커는 sd-impl 소관이라 모방 금지).
- 설계 작성법(§4~6): ${DESIGN_FMT}
- 공유 형식·골격: ${SKILL_PATH}
- §7~9 작성법: ${ANALYZE_FMT}
- 모범(example-spec.md): ${EXAMPLE_PATH}
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
// Derive: §4/§5/§6 헤더 분할 결과 + 입력 컨텍스트(요구목록·도메인 모델 등) 요약.
const DERIVE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["screens", "autoProcesses", "commonBases", "requirements", "context", "notes"],
  properties: {
    screens: {
      type: "array",
      description: "§4 화면 도출 결과 (화면 목록 표의 행이 됨)",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "category", "kind", "device", "source"],
        properties: {
          name: { type: "string", description: "화면명 ([화면.X] 의 X). '(모달)' 등 사용 맥락 표기 금지" },
          category: { type: "string", description: "도메인 묶음·메뉴 그룹 자유 명칭 (예: 기준정보·입고·재고)" },
          kind: { type: "string", enum: ["마스터", "트랜잭션", "조회"], description: "유형" },
          device: { type: "string", enum: ["PC", "PDA", "기타"], description: "장치" },
          source: { type: "string", description: "도출 근거 (예: '[프로세스.입고] BPMN 액션 노드', '[모델.품목] 마스터', '[기타.과거 재고 조회]')" },
        },
      },
    },
    autoProcesses: {
      type: "array",
      description: "§5 자동 처리 도출 결과 (스케줄·이벤트 트리거가 명시적으로 있는 백그라운드 처리)",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "trigger", "source"],
        properties: {
          name: { type: "string", description: "자동 처리명 ([자동 처리.X] 의 X)" },
          trigger: { type: "string", description: "스케줄·이벤트 트리거 (예: '매일 0시 정각')" },
          source: { type: "string", description: "도출 근거 (§2/§3 본문 위치·인용)" },
        },
      },
    },
    commonBases: {
      type: "array",
      description: "§6 공통·기반 기능 도출 결과 (§4/§5 에 속하지 않는 개발 단위: 부수효과 동작 + 전역 정적 골격)",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "framework", "source"],
        properties: {
          name: { type: "string", description: "공통·기반 기능명 ([기반.X] 의 X)" },
          framework: {
            type: "boolean",
            description: "프레임워크 기본 기능(매뉴얼 존재)이면 true → 참조 매뉴얼 stub. 앱 고유 bespoke 면 false → 본문 자유 서술",
          },
          source: { type: "string", description: "도출 근거 (§3 시스템 기반 류 요구 등)" },
        },
      },
    },
    requirements: {
      type: "array",
      description: "§1~3(+§7~9)에서 추출한 요구 항목 평면 목록 — Verify 의 §4~6 역대조 기준이 됨. BPMN 액션 노드·흐름 bullet 룰·§3 직접 요구·시스템 기반 요구를 빠짐없이 추출",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text", "origin"],
        properties: {
          id: { type: "string", description: "요구 식별자 (예: R1, R2 …)" },
          text: { type: "string", description: "요구 한 줄 (사용자 도메인 어휘)" },
          origin: { type: "string", description: "출처 (§2.1 BPMN 노드 / §2.1 흐름 bullet / §3.1 / §7.x 등)" },
        },
      },
    },
    context: {
      type: "string",
      description: "§1~3(+§7~9) 핵심 요약 — map 단계 각 작성 에이전트가 공유할 도메인 컨텍스트(프로세스·도메인 모델·외부 자료·외부 인터페이스 핵심)",
    },
    notes: { type: "string", description: "도출 근거·애매점·[OPEN] 후보 요약" },
  },
};

// 한 섹션 본문 작성 결과.
const SECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["section", "title", "markdown", "relatedRefs", "opens", "evidence"],
  properties: {
    section: { type: "string", description: "섹션 종류: 화면 | 자동 처리 | 기반" },
    title: { type: "string", description: "이 단위명 ([화면.X]/[자동 처리.X]/[기반.X] 의 X)" },
    markdown: { type: "string", description: "format-design.md §별 작성법을 따른 완성 본문 (헤더 §번호 제외, 헤더 텍스트부터). reduce 에서 §번호 부여·정합" },
    relatedRefs: {
      type: "array",
      items: { type: "string" },
      description: "이 본문에서 참조한 [카테고리.이름] 전부 (dangling 검증용)",
    },
    opens: {
      type: "array",
      items: { type: "string" },
      description: "이 본문에 부착한 [OPEN] 항목들 (검토 패키지용)",
    },
    evidence: {
      type: "array",
      items: { type: "string" },
      description: "이 본문에 부착한 (근거: 출처) 항목들 — '<항목>: <출처>' 형식 (verify 1:1 대조용)",
    },
  },
};

// Verify(역대조·근거·dangling·커버리지): 통합 검증 결과.
const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["forgedEvidence", "uncovered", "danglingRefs", "coverageGaps", "verdict", "notes"],
  properties: {
    forgedEvidence: {
      type: "array",
      description: "(근거:…) 좌표가 원자료에서 실제 그 내용을 담지 않는 항목 — [OPEN] 강등 대상",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item", "claimedSource", "finding"],
        properties: {
          item: { type: "string", description: "근거가 붙은 spec 항목" },
          claimedSource: { type: "string", description: "spec 이 주장한 출처 좌표" },
          finding: { type: "string", description: "원자료 재확인 결과 (불일치 사유)" },
        },
      },
    },
    uncovered: {
      type: "array",
      description: "원자료↔spec 전수 대조로 발견한, §4~6 에 반영되지 않은 요구·자료 부분",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["requirement", "origin", "note"],
        properties: {
          requirement: { type: "string", description: "미반영 요구·자료" },
          origin: { type: "string", description: "출처 (요구 id 또는 §/자료 좌표)" },
          note: { type: "string", description: "왜 미반영으로 판단했는지" },
        },
      },
    },
    danglingRefs: {
      type: "array",
      description: "[화면.X]·[모델.X]·[자동 처리.X]·[기반.X]·[공통 정의.X] 등이 실존 섹션을 가리키지 않는 참조",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ref", "usedIn"],
        properties: {
          ref: { type: "string", description: "dangling 참조 ([카테고리.이름])" },
          usedIn: { type: "string", description: "이 참조가 등장한 위치" },
        },
      },
    },
    coverageGaps: {
      type: "array",
      items: { type: "string" },
      description: "쓴 자료 중 spec 에 미반영된 부분 (자료 커버리지 보고)",
    },
    verdict: {
      type: "string",
      enum: ["clean", "issues"],
      description: "검증 종합 — 문제 없으면 clean, 강등·미반영·dangling 중 하나라도 있으면 issues",
    },
    notes: { type: "string", description: "검증 근거·판정 요약" },
  },
};

// ── [Read] spec.md(확정 §1~3) + format-design.md(§4~6 작성법) + SKILL.md(공유 형식) 로딩 ──
// Derive 단계가 직접 Read 하므로 별도 phase 없이 Derive 안에서 수행.

// ── [Derive] §4/§5/§6 헤더 분할 (단일 에이전트) ────────────────
phase("Derive");
const derived = await agent(
  `${PRINCIPLES}

너의 일 (설계 배치 1단계 — 설계 분할 도출, 단일 에이전트).

1. spec.md(${SPEC_PATH})를 Read. ${DESIGN_FMT} 의 "설계 분할 절차 (§4/§5/§6 공통)" 절도 Read 해 절차를 따른다.
2. 확정된 §1~3(+ 도출된 §7 공통 정의 / §8 도메인 모델 / §9 외부 인터페이스)을 입력으로 삼는다. 헤더가 [OPEN] 상태인 §2/§3 은 본문 미확정이므로 도출 입력에서 제외하되, notes 에 "[OPEN] 섹션 X 미반영" 으로 기록.
3. 설계 분할 절차대로 도출:
   - §4 화면: §2 BPMN 의 최종 사용자 액션 노드 + §3 의 사용자 직접 요구 → 트랜잭션/조회 화면. §8 마스터 엔티티 → 마스터 화면. 도메인 묶음·장치별로 분류(category). 유형(kind)·장치(device) 판정.
     - 모달 화면도 별도 화면. 단, 한 화면의 일부 영역(시트·탭)이 다른 화면에서 모달로 재활용되는 경우는 별도 화면으로 분리하지 않음(부모 화면 동작 절에 제약 명시). 전용 모달이 한 곳에서만 쓰이면 부모 §4.x 의 sub-section 으로 포함할 수도 있음 — 이 판단은 reduce 에서 정합하니 일단 후보로 적되 source 에 재활용/전용 여부를 메모.
   - §5 자동 처리: §2/§3 의 시스템 백그라운드 처리(스케줄·이벤트 트리거·표준 채널 외부 자료 수집·적재)를 추출. **명시적 트리거가 있는 것만**.
   - §6 공통·기반 기능: §4/§5 에 속하지 않는 모든 개발 단위 — 부수효과 발동 동작(DataLog·권한 체크·캐시 무효화·알림·감사 로그) + 전역 정적 골격(앱 구조[메뉴·권한·모듈]·로깅·부트스트랩 초기화). §3 의 "시스템 기반" 류 요구가 주 도출원. 프레임워크 기본 기능(매뉴얼 존재)이면 framework=true.
4. 요구목록(requirements) 추출: Verify 의 역대조 기준이 된다. §2 BPMN 액션 노드·흐름 설명 bullet 의 룰/조건/계산식·§3 직접 요구·§3 시스템 기반 요구·§7 공통 규격·§9 외부 인터페이스 호출을 빠짐없이 평면 추출(누락 = 검증 실패의 원인). 각 항목에 출처 좌표.
5. context: §1~3(+§7~9) 핵심을 map 작성 에이전트가 공유할 수 있게 요약(프로세스 흐름·도메인 모델 필드·외부 자료·외부 인터페이스).

도출 근거가 없는 화면/처리/기반은 만들어내지 말 것(환각 차단). 근거가 모호하면 notes 에 [OPEN] 후보로 기록.
screens / autoProcesses / commonBases / requirements / context / notes 를 반환.`,
  { label: "derive", phase: "Derive", schema: DERIVE_SCHEMA },
);

if (!derived) throw new Error("[Derive] 설계 분할 도출 에이전트 실행 실패(null) — 중단.");
const SCREENS = (derived.screens ?? []).filter(Boolean);
const AUTOS = (derived.autoProcesses ?? []).filter(Boolean);
const BASES = (derived.commonBases ?? []).filter(Boolean);
const REQUIREMENTS = (derived.requirements ?? []).filter(Boolean);
const CONTEXT = derived.context ?? "";

if (SCREENS.length + AUTOS.length + BASES.length === 0) {
  throw new Error(
    "§4/§5/§6 도출 결과가 비었습니다. 확정된 §1~3 본문이 spec.md 에 있는지 확인하세요(모두 [OPEN] 이면 설계 입력이 없음).",
  );
}
log(
  `도출: 화면 ${SCREENS.length} · 자동 처리 ${AUTOS.length} · 공통·기반 ${BASES.length} / 요구 ${REQUIREMENTS.length}건`,
);

// 도출 컨텍스트 — map 작성 에이전트에 공유.
const DERIVE_CONTEXT = `
설계 분할 도출 결과(§1~3 기반):

[화면 목록]
${SCREENS.map((s) => `- ${s.name} | ${s.category} | ${s.kind} | ${s.device} (도출: ${s.source})`).join("\n") || "- (없음)"}

[자동 처리]
${AUTOS.map((a) => `- ${a.name} | 트리거: ${a.trigger} (도출: ${a.source})`).join("\n") || "- (없음)"}

[공통·기반]
${BASES.map((b) => `- ${b.name} | ${b.framework ? "프레임워크 기본(매뉴얼 참조)" : "bespoke(자유 서술)"} (도출: ${b.source})`).join("\n") || "- (없음)"}

[§1~3(+§7~9) 핵심 컨텍스트]
${CONTEXT}
`;

// ── [Map] §4/§5/§6 본문 병렬 작성 ──────────────────────────────
// 각 단위 1 에이전트. 규모에 따라 fan-out 폭이 자동으로 조절됨.
phase("Map");

const screenThunks = SCREENS.map((s) => () =>
  agent(
    `${PRINCIPLES}

${DERIVE_CONTEXT}

너의 일 (§4 화면 본문 작성 — 단위 1건).

대상 화면: ${s.name} (분류: ${s.category} / 유형: ${s.kind} / 장치: ${s.device})
도출 근거: ${s.source}

작성 절차:
1. ${DESIGN_FMT} 의 "§4 화면" 절 전체(설계 분할 절차 제외 — 화면 정의 표준 구조·와이어프레임·항목·동작·시각 규칙·도메인 규칙·마스터 화면 표준·상단 command 바·모달 처리)를 Read.
2. 모범: §4 작성법 첫머리 "모범 (와이어 패턴별)" 에서 이 화면 유형에 맞는 패턴의 § 를 example-spec.md 에서 Read 해 헤더 구조·표 형식을 직접 대조([구현] 마커는 sd-impl 소관이라 모방 금지).
3. spec.md(${SPEC_PATH})의 관련 §2/§3 본문 + §7/§8/§9 를 다시 Read 해 이 화면이 충족할 요구·도메인 모델·양식을 근거로 삼는다.
4. "§4.x 표준 구조" 순서대로 본문을 작성: 헤더 인덱스(Actor·관련 섹션) → 기능 개요 → 와이어프레임 → 항목(영역별 표) → 동작 → 시각 규칙(해당 시) → 도메인 규칙·로직(해당 시) → 자유 추가 sub-section(양식 입출력 등 해당 시).
   - 와이어프레임: 영역 배치·구획만. 디테일은 항목/동작/도메인 규칙 절이 단일 출처. ASCII 박스·영역 추상화 표기를 임의 변형 금지.
   - 항목 표: 도메인 매핑은 \`[모델.X.Y]\` 형식. 매핑 없으면 \`-\`. 필수 없으면 \`-\`. 비고에 비자명 표시 내용·편집 방법.
   - 마스터 유형이면 "마스터 화면 표준"(선택 체크박스·ID 편집 버튼·시트 상단 버튼바·ID 내림차순) 적용.
   - 모달: 호출하는 쪽 동작에 "→ [화면.X] 을 모달로 띄움" 명시. 일부 영역 재활용 시 동작 절 끝에 영역별 제약(편집 가능/선택 전용/multiselect) 한 줄씩.
5. 헤더 텍스트는 \`### {화면명} (${s.device})\` 형식 — §번호와 날짜 마커는 reduce 에서 부여하므로 markdown 에 §번호를 넣지 말 것(헤더 텍스트만). [확정] 마커 금지.
6. 근거 있는 비자명 항목엔 줄끝 (근거: 출처). 근거 없는 값(예: 그리드 행/열 수, 미정 규격)은 임의로 채우지 말고 [OPEN] 으로.

markdown(완성 본문) + relatedRefs(참조한 [카테고리.이름] 전부) + opens([OPEN] 항목) + evidence(부착한 근거 '<항목>: <출처>') 를 반환. section="화면", title="${s.name}".`,
    { label: `map:screen:${s.name}`, phase: "Map", schema: SECTION_SCHEMA },
  ),
);

const autoThunks = AUTOS.map((a) => () =>
  agent(
    `${PRINCIPLES}

${DERIVE_CONTEXT}

너의 일 (§5 자동 처리 본문 작성 — 단위 1건).

대상 자동 처리: ${a.name} (트리거: ${a.trigger})
도출 근거: ${a.source}

작성 절차:
1. ${DESIGN_FMT} 의 "§5 자동 처리" 절 전체(정의·본문 구조·처리·예외 처리·양식 입출력)를 Read.
2. 모범: example-spec.md §5.1 을 Read 해 형식을 직접 대조.
3. spec.md(${SPEC_PATH})의 관련 §2/§3 + §7/§8/§9 를 다시 Read.
4. 본문을 작성: 평문(목적: / 트리거: / 관련 섹션:) → #### 처리 → #### 예외 처리 → 자유 추가 sub-section(읽기/쓰기 양식 등 해당 시).
   - 예외 처리는 실패 케이스별 위험·대처·재시도 한계.
   - §5 는 명시적 스케줄·이벤트 트리거가 핵심. 표준 프로토콜·채널 외부 자료 수집·적재도 §5(시스템별 협상 없는 표준 인터페이싱).
5. 헤더 텍스트는 \`### {자동 처리명}\` (§번호·날짜 마커는 reduce 에서). markdown 에 §번호 금지. [확정] 마커 금지.
6. 비자명 항목엔 줄끝 (근거: 출처). 근거 없으면 [OPEN].

markdown + relatedRefs + opens + evidence 를 반환. section="자동 처리", title="${a.name}".`,
    { label: `map:auto:${a.name}`, phase: "Map", schema: SECTION_SCHEMA },
  ),
);

const baseThunks = BASES.map((b) => () =>
  agent(
    `${PRINCIPLES}

${DERIVE_CONTEXT}

너의 일 (§6 공통·기반 기능 본문 작성 — 단위 1건).

대상 공통·기반 기능: ${b.name} (${b.framework ? "프레임워크 기본 기능 후보(매뉴얼 존재)" : "앱 고유 bespoke 후보"})
도출 근거: ${b.source}

작성 절차:
1. ${DESIGN_FMT} 의 "§6 공통·기반 기능" 절 전체(정의·본문 구조·프레임워크 기본/ bespoke 두 갈래)를 Read.
2. 모범: example-spec.md §6.1(프레임워크 기본=참조 매뉴얼 stub)·§6.2(bespoke=자유 서술)를 Read 해 형식을 직접 대조.
3. spec.md(${SPEC_PATH})의 관련 §3(시스템 기반 류 요구)·관련 §2/§7/§8 를 다시 Read.
4. 두 갈래로 작성:
   - 프레임워크 기본 기능(앱 구조·로깅·부트스트랩·데이터 변경 이력 등 매뉴얼 존재)이라면 → 평문 라벨(목적: / 트리거·적용 범위:(해당 시) / 관련 섹션:) + \`참조 매뉴얼:\` 한 줄. 처리·구성·예외 detail 은 적지 않음(매뉴얼 위임).
     - 참조 매뉴얼 파일명이 실제 존재하는지 \`.claude/references/sd-simplysm14/manuals/\` 를 Glob 으로 확인. 확신 없으면 파일명을 추정으로 적되 \`[OPEN] 참조 매뉴얼명 미확인\` 메모.
   - bespoke(앱 고유 부수효과, 매뉴얼 없음)라면 → 평문 라벨 + 본문 한두 줄 자유 서술(설계 고도까지만, 구현 디테일 금지). 정말 필요한 정보만 h4 자유 추가.
5. 헤더 텍스트는 \`### {기능명}\` (§번호·날짜 마커는 reduce 에서). markdown 에 §번호 금지. [확정] 마커 금지.
6. 비자명 항목엔 줄끝 (근거: 출처). 근거 없으면 [OPEN].

markdown + relatedRefs + opens + evidence 를 반환. section="기반", title="${b.name}".`,
    { label: `map:base:${b.name}`, phase: "Map", schema: SECTION_SCHEMA },
  ),
);

const mappedRaw = await parallel([...screenThunks, ...autoThunks, ...baseThunks]);
assertNoFailures(mappedRaw, "Map", [
  ...SCREENS.map((s) => `map:screen:${s.name}`),
  ...AUTOS.map((a) => `map:auto:${a.name}`),
  ...BASES.map((b) => `map:base:${b.name}`),
]);
const mapped = mappedRaw;

const screenSections = mapped.filter((m) => m.section === "화면");
const autoSections = mapped.filter((m) => m.section === "자동 처리");
const baseSections = mapped.filter((m) => m.section === "기반");
if (screenSections.length !== SCREENS.length || autoSections.length !== AUTOS.length || baseSections.length !== BASES.length)
  throw new Error(
    `[Map] 작성 단위 수 불일치 — 화면 ${screenSections.length}/${SCREENS.length}·자동 ${autoSections.length}/${AUTOS.length}·기반 ${baseSections.length}/${BASES.length}. 중단.`,
  );
log(
  `본문 작성: 화면 ${screenSections.length}/${SCREENS.length} · 자동 처리 ${autoSections.length}/${AUTOS.length} · 공통·기반 ${baseSections.length}/${BASES.length}`,
);

// ── [Reduce] 교차참조 정합 (단일 에이전트) ─────────────────────
// 화면 목록 표 + §번호 부여 + 모달/시트 재활용 교차참조 정합.
phase("Reduce");

const SECTIONS_DUMP = (label, arr) =>
  `=== ${label} ===\n` +
  arr
    .map(
      (m) =>
        `--- [${m.section}.${m.title}] ---\nrelatedRefs: ${(m.relatedRefs ?? []).join(", ") || "(없음)"}\nopens: ${(m.opens ?? []).join(" | ") || "(없음)"}\n\n${m.markdown}\n`,
    )
    .join("\n");

const REDUCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["screenTable", "sections", "consistencyNotes"],
  properties: {
    screenTable: {
      type: "string",
      description: "§4 첫머리 화면 목록 표 (markdown). 5컬럼 `§ | 분류 | 화면 | 유형 | 장치`, 같은 분류 인접, §번호는 4.1부터",
    },
    sections: {
      type: "array",
      description: "§번호가 부여되고 교차참조가 정합된 최종 섹션들 (순서대로 §4 → §5 → §6)",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["group", "number", "title", "markdown"],
        properties: {
          group: { type: "string", enum: ["화면", "자동 처리", "기반"] },
          number: { type: "string", description: "부여된 §번호 (예: 4.1, 5.1, 6.1)" },
          title: { type: "string", description: "단위명 ([카테고리.이름] 의 이름)" },
          markdown: { type: "string", description: "§번호가 부여된 헤더(### N.N …)부터의 최종 본문" },
        },
      },
    },
    consistencyNotes: {
      type: "string",
      description: "정합에서 변경·통합한 내용 (모달 병합·재활용 제약 부착·번호 부여·관련 섹션 보정 등)",
    },
  },
};

const reduced = await agent(
  `${PRINCIPLES}

${DERIVE_CONTEXT}

너의 일 (설계 배치 reduce — 교차참조 정합, 단일 에이전트). map 단계가 병렬로 작성한 §4/§5/§6 본문을 받아 일관성을 결정한다.

${SECTIONS_DUMP("§4 화면 (작성 본문)", screenSections)}

${SECTIONS_DUMP("§5 자동 처리 (작성 본문)", autoSections)}

${SECTIONS_DUMP("§6 공통·기반 (작성 본문)", baseSections)}

정합 작업:
1. §번호 부여: §4 화면은 같은 분류(category)끼리 인접하도록 정렬해 4.1, 4.2 … / §5 는 5.1 … / §6 는 6.1 …. 부여한 번호를 각 본문 헤더에 반영(### N.N {제목} (장치) 형식, 화면은 장치 표기 유지, 자동/기반은 장치 표기 없음). [확정] 마커 금지.
2. 화면 목록 표 작성: §4 첫머리 5컬럼 표 \`§ | 분류 | 화면 | 유형 | 장치\`. 같은 분류 인접 배치.
3. 모달/시트 재활용 교차참조 정합:
   - 호출하는 쪽 동작의 "→ [화면.X] 을 모달로 띄움" 과 호출되는 §4.x 가 양쪽 다 존재하는지 확인. 한쪽만 있으면 보정(누락측 추가 또는 관련 섹션 보강).
   - 한 화면의 일부 영역이 다른 화면에서 모달로 재활용되는 경우: 별도 화면으로 분리하지 말고 부모 화면 동작 절 끝에 영역별 제약(편집 가능/선택 전용/multiselect)을 한 줄씩. 호출 쪽 동작은 "→ [화면.X] 의 <영역> 을 모달로 띄움".
   - 전용 모달이 한 호출처에서만 쓰이면 부모 §4.x 의 sub-section(h4/h5)으로 포함할지, 별도 §4.x 로 둘지 일관되게 결정.
   - 화면 목록 표는 별도 §4.x 로 둔 화면만 행으로 가짐(부모에 흡수된 전용 모달은 행 없음 — example 의 표 아래 한 줄 설명처럼 처리).
4. 관련 섹션 한 줄 정합: 각 본문의 \`관련 섹션:\` 이 실제 참조와 일치하는지, 양방향 의존(A→B 면 B 의 관련 섹션에 A 고려)을 보정.
5. 도메인 모델·외부 인터페이스 참조([모델.X]·[외부 인터페이스.X])가 §8/§9 에 실존하는지 확인하고, 본문이 새 엔티티·새 외부 호출을 전제로 하면 consistencyNotes 에 "§8/§9 신규 필요" 로 기록(이 배치는 §4~6 만 write 하므로 §8/§9 는 건드리지 않음 — 검토 패키지 보고용).

내용물(항목·동작·필드)은 임의로 바꾸지 말 것 — 번호·교차참조·재활용 제약·관련 섹션 정합만 수행. 무관 본문은 보존.
screenTable / sections(§번호 부여된 최종 본문, §4→§5→§6 순서) / consistencyNotes 를 반환.`,
  { label: "reduce", phase: "Reduce", schema: REDUCE_SCHEMA },
);

if (!reduced) throw new Error("[Reduce] 교차참조 정합 에이전트 실행 실패(null) — 중단.");
const FINAL_SECTIONS = (reduced.sections ?? []).filter(Boolean);
if (FINAL_SECTIONS.length === 0) throw new Error("reduce 가 정합된 섹션을 반환하지 않았습니다.");
log(`정합 완료: 섹션 ${FINAL_SECTIONS.length}개, 화면 목록 표 생성`);

// ── [Verify] 독립 컨텍스트 fan-out 검증 ────────────────────────
// 1) 근거 1:1 대조  2) 원자료↔spec 전수 대조(누락)  3) §1~3 요구목록→§4~6 역대조  4) dangling 참조 grep · 커버리지
phase("Verify");

// 전체 §4~6 본문 묶음 (검증 입력).
// s.markdown 은 이미 §번호 헤더(### N.N …)를 포함하므로 그대로 사용(헤더 중복 방지).
const FINAL_DUMP = FINAL_SECTIONS.map((s) => s.markdown).join("\n\n");
const ALL_EVIDENCE = mapped.flatMap((m) =>
  (m.evidence ?? []).map((e) => `[${m.section}.${m.title}] ${e}`),
);
const ALL_REFS = [...new Set(mapped.flatMap((m) => m.relatedRefs ?? []))];

// 1) 근거 1:1 대조 (병렬, 근거별)
const evidenceThunks = ALL_EVIDENCE.map((ev) => () =>
  agent(
    `${PRINCIPLES}

너의 일 (verify — 근거 위조 검증, 독립 컨텍스트 1건).

설계 본문에 부착된 다음 (근거: …) 항목이 원자료에서 실제로 그 내용을 담는지 원자료를 직접 Read/Grep 해 1:1 대조하라.

근거 항목: ${ev}

판정:
- spec 항목이 주장한 출처 좌표를 실제 자료에서 열어 내용이 일치하면 forgedEvidence 비움.
- 좌표가 그 내용을 담지 않으면(과장·오인·없음) forgedEvidence 에 {item, claimedSource, finding} 으로 보고 → [OPEN] 강등 대상.
나머지 필드(uncovered/danglingRefs/coverageGaps)는 이 잡에서 비워도 됨. verdict 는 forgedEvidence 유무로.`,
    { label: `verify:evidence`, phase: "Verify", schema: VERIFY_SCHEMA },
  ),
);

// 2)+3) 요구목록 역대조 + 원자료↔spec 누락 대조 (단일 통합 잡 — 전체 시야 필요)
const reverseThunk = () =>
  agent(
    `${PRINCIPLES}

너의 일 (verify — §1~3 요구목록 → §4~6 역대조 + 원자료↔spec 누락 대조, 전체 시야 1건).

아래는 설계 분할 단계에서 §1~3(+§7~9)에서 추출한 요구목록이다. 각 요구가 §4~6 본문에서 실제로 커버되는지 역대조하라. 동시에 spec.md(${SPEC_PATH})의 §1~3·§7~9 원본을 직접 Read 해, 요구목록에 빠졌으나 §4~6 이 마땅히 커버해야 할 부분도 함께 대조하라(요구목록 자체의 누락도 검증).

요구목록:
${REQUIREMENTS.map((r) => `- ${r.id}: ${r.text} (출처: ${r.origin})`).join("\n") || "- (없음)"}

작성된 §4~6 본문:
${FINAL_DUMP}

판정:
- §4~6 중 어느 곳에서도 커버되지 않는 요구는 uncovered 에 {requirement, origin, note} 로 보고.
- 단, [OPEN] 으로 정당하게 보류된 항목은 누락이 아님 — note 에 "[OPEN] 처리됨" 으로 구분.
forgedEvidence/danglingRefs/coverageGaps 는 비워도 됨. verdict 는 uncovered 유무로.`,
    { label: `verify:reverse`, phase: "Verify", schema: VERIFY_SCHEMA },
  );

// 4) dangling 참조 + 커버리지 (단일 잡 — spec 전체 grep)
const danglingThunk = () =>
  agent(
    `${PRINCIPLES}

너의 일 (verify — dangling 참조 검증 + 자료 커버리지, 전체 시야 1건).

[dangling] 아래는 §4~6 본문이 사용한 [카테고리.이름] 참조 전부다. 각 참조가 실존 섹션을 가리키는지 spec.md(${SPEC_PATH}) 전체를 Read/Grep 해 확인하라.
- [화면.X] → §4 에 화면 X 실존?
- [자동 처리.X] → §5 에 실존?
- [기반.X] → §6 에 실존?
- [모델.X] / [공통 정의.X] / [외부 인터페이스.X] → §8/§7/§9 에 실존? (이 배치는 §4~6 만 write 하므로, §7~9 가 아직 없으면 "§7~9 신규 필요" 로 보고)
실존하지 않으면 danglingRefs 에 {ref, usedIn} 으로 보고.

참조 목록:
${ALL_REFS.map((r) => `- ${r}`).join("\n") || "- (없음)"}

작성된 §4~6 본문:
${FINAL_DUMP}

[커버리지] 설계에 쓴 자료(§1~3·§7~9 및 그것이 인용한 원자료) 중 §4~6 에 미반영된 부분을 coverageGaps 에 보고.

forgedEvidence/uncovered 는 비워도 됨. verdict 는 danglingRefs/coverageGaps 유무로.`,
    { label: `verify:dangling`, phase: "Verify", schema: VERIFY_SCHEMA },
  );

const verifyResults = await parallel([...evidenceThunks, reverseThunk, danglingThunk]);
assertNoFailures(verifyResults, "Verify", [
  ...ALL_EVIDENCE.map((ev) => `verify:evidence:${ev.slice(0, 40)}`),
  "verify:reverse",
  "verify:dangling",
]);

const forgedEvidence = verifyResults.flatMap((v) => v.forgedEvidence ?? []);
const uncovered = verifyResults.flatMap((v) => v.uncovered ?? []);
const danglingRefs = verifyResults.flatMap((v) => v.danglingRefs ?? []);
const coverageGaps = [...new Set(verifyResults.flatMap((v) => v.coverageGaps ?? []))];
log(
  `검증: 근거위조 ${forgedEvidence.length} · 미반영 ${uncovered.length} · dangling ${danglingRefs.length} · 커버리지갭 ${coverageGaps.length}`,
);

// ── [Write] §4~6 을 spec.md 에 반영 ────────────────────────────
// 근거 위조분은 [OPEN] 강등하고, 정합된 §4~6 본문 + 화면 목록 표를 spec.md 의 ## 4./## 5./## 6. 자리에 써넣는다.
phase("Write");

const screenFinal = FINAL_SECTIONS.filter((s) => s.group === "화면");
const autoFinal = FINAL_SECTIONS.filter((s) => s.group === "자동 처리");
const baseFinal = FINAL_SECTIONS.filter((s) => s.group === "기반");

const WRITE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["written", "demoted", "summary"],
  properties: {
    written: {
      type: "array",
      items: { type: "string" },
      description: "spec.md 에 써넣은 섹션 목록 (§번호 + 제목)",
    },
    demoted: {
      type: "array",
      items: { type: "string" },
      description: "근거 위조로 [OPEN] 강등한 항목 목록",
    },
    summary: { type: "string", description: "write 결과 요약 (어느 헤더 아래에 어떻게 반영했는지)" },
  },
};

const written = await agent(
  `${PRINCIPLES}

너의 일 (설계 배치 write — §4~6 을 spec.md 에 반영). spec.md(${SPEC_PATH})를 Read 한 뒤 Edit 으로 §4/§5/§6 본문을 써넣는다.

[근거 위조 강등] 아래 항목들은 verify 에서 근거가 원자료와 불일치로 확인됨 → 해당 항목의 (근거: …)를 제거하고 [OPEN] 으로 강등한 채 써넣어라(필요 시 "[OPEN] <항목> — 근거 위조 의심(주장출처: <claimedSource>), 재확인 필요" 메모로 원 좌표 보존).
${forgedEvidence.length ? forgedEvidence.map((f) => `- ${f.item} (주장출처: ${f.claimedSource} / 불일치: ${f.finding})`).join("\n") : "- (없음)"}

[써넣을 §4 화면] — 화면 목록 표를 ## 4. 화면 헤더 바로 아래에 먼저, 이어서 각 화면 본문(### 4.x …)을 순서대로:

화면 목록 표:
${reduced.screenTable}

화면 본문:
${screenFinal.map((s) => s.markdown).join("\n\n") || "(없음)"}

[써넣을 §5 자동 처리] — ## 5. 자동 처리 헤더 아래에 순서대로:
${autoFinal.map((s) => s.markdown).join("\n\n") || "(없음)"}

[써넣을 §6 공통·기반 기능] — ## 6. 공통·기반 기능 헤더 아래에 순서대로:
${baseFinal.map((s) => s.markdown).join("\n\n") || "(없음)"}

반영 방법:
- spec.md 의 기존 \`## 4. 화면\` / \`## 5. 자동 처리\` / \`## 6. 공통·기반 기능\` 헤더는 유지하고, 그 헤더와 다음 \`## \` 헤더 사이의 내용만 위 내용으로 채운다(헤더 자체·§1~3·§7~10 은 절대 건드리지 말 것 — 무관 섹션 보존, 일괄 치환 금지).
- 헤더가 이미 본문을 갖고 있으면(재설계) 해당 §4~6 영역만 교체.
- 헤더 §번호·텍스트는 reduce 가 부여한 그대로. [확정] 마커 금지. 화면 헤더는 (PC)/(PDA) 장치 표기 유지.
- Edit 으로 정확히 그 영역만 치환. 여러 번 Edit 해도 됨.

written(써넣은 섹션) / demoted(강등 항목) / summary 를 반환.`,
  { label: "write", phase: "Write", schema: WRITE_SCHEMA },
);

if (!written) throw new Error("[Write] §4~6 반영 에이전트 실행 실패(null) — spec.md 반영 미완료, 중단.");
log(`반영 완료: ${(written.written ?? []).length}개 섹션 · 강등 ${(written.demoted ?? []).length}건`);

// ── 결과 반환: 검토 패키지(쓴 섹션 요약 + [OPEN] + verify + 커버리지) ──
const ALL_OPENS = mapped.flatMap((m) => (m.opens ?? []).map((o) => `[${m.section}.${m.title}] ${o}`));

return {
  specPath: SPEC_PATH,
  written: written?.written ?? [],
  demoted: written?.demoted ?? [],
  screenTable: reduced.screenTable,
  derived: {
    screens: SCREENS.map((s) => ({ name: s.name, category: s.category, kind: s.kind, device: s.device })),
    autoProcesses: AUTOS.map((a) => ({ name: a.name, trigger: a.trigger })),
    commonBases: BASES.map((b) => ({ name: b.name, framework: b.framework })),
    notes: derived?.notes ?? "",
  },
  consistencyNotes: reduced.consistencyNotes,
  opens: ALL_OPENS,
  verify: {
    forgedEvidence,
    uncovered,
    danglingRefs,
    coverageGaps,
  },
  summary: {
    screens: screenFinal.length,
    autoProcesses: autoFinal.length,
    commonBases: baseFinal.length,
    requirements: REQUIREMENTS.length,
    opens: ALL_OPENS.length,
    forged: forgedEvidence.length,
    uncovered: uncovered.length,
    dangling: danglingRefs.length,
    coverageGaps: coverageGaps.length,
  },
};
