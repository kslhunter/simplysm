export const meta = {
  name: "sd-debug",
  description:
    "버그·실패·예외의 원인 가설을 다관점으로 발굴하고 가설별로 검증→해결책→적대검증을 거쳐 검증된 해결책을 구조화 보고하는 멀티에이전트 디버깅",
  phases: [
    { title: "Hypothesize", detail: "관점 동적 생성 + 관점별 병렬 추출 + 자유탐색 + 의미 중복제거" },
    { title: "Verify", detail: "가설별 검증→해결책 통합 (명백 오류·근거 전무 기각, 통과 시 근본 우선 해결책 ≤2, 무배리어)" },
    { title: "Adversarial", detail: "가설+해결책 쌍별 4관점 적대검증 veto+다수결 (무배리어)" },
  ],
};

// ── 입력 ───────────────────────────────────────────────────────
// args: 문제 설명(필수). 에러·스택·재현조건·코드경로·환경은 선택.
//       대화 맥락에서 호출되면 메인 루프가 위 정보를 요약해 args 로 전달.
if (args == null || (typeof args === "string" && args.trim() === "")) {
  throw new Error(
    "디버깅할 문제 설명을 args 로 전달하세요 (증상·기대동작·관찰결과 등; 에러/재현조건/코드경로는 선택).",
  );
}
const problem = typeof args === "string" ? args : JSON.stringify(args);

// ── 공통 원칙(모든 단계 주입) ──────────────────────────────────
const PRINCIPLES = `
디버깅 원칙:
- 모든 판정은 실제 코드/설정을 Read 하여 확인. 근거 없는 추측·일반론 금지(추측은 '가설'로만 등록, 사실로 단정 금지).
- 현재 워킹트리만 기준. git log/diff/show/blame 등 과거 조회 금지. .back/ 및 .gitignore 등재 경로(node_modules·dist·.tmp 등) 읽지 말 것.
- 결측(null/undefined)은 결측대로 다룰 것. 빈 값을 추측으로 채우지 말 것.
- 입력 정보가 부족하면 Grep/Glob/Read 로 코드베이스를 직접 조사해 보강.
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

// ── 적대검증 관점 4개 ──────────────────────────────────────────
const LENSES = [
  { key: "causal", title: "인과", focus: "해결책이 이 가설의 원인을 실제로 제거하는가. 원인-증상 인과가 성립하는가." },
  {
    key: "regression",
    title: "회귀·부작용",
    focus:
      "해결책이 새 버그·룰 위반·엣지케이스(결측 null/undefined·동시성/트랜잭션·soft delete 동명 레코드·권한 분기·타입/스키마 제약)를 유발하는가.",
  },
  { key: "evidence", title: "증거 정합", focus: "가설의 근거가 실제 코드/스택과 일치하는가. 오인·과장은 없는가." },
  { key: "alternative", title: "대안 원인", focus: "이 가설 말고 다른 원인이 진짜일 가능성은 없는가." },
];

// ── 의심 범주 예시(단일 소스 — 스키마 설명·관점 도출 프롬프트가 공유) ──
const PERSPECTIVE_EXAMPLES =
  "동시성·타이밍, 데이터·결측, 타입·계약, 로직·경계조건, 외부의존·환경·설정, 상태·생명주기";

// ── 스키마 ─────────────────────────────────────────────────────
const PERSPECTIVES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["perspectives", "notes"],
  properties: {
    perspectives: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "title", "focus"],
        properties: {
          key: { type: "string" },
          title: { type: "string", description: `의심 범주 이름(예: ${PERSPECTIVE_EXAMPLES})` },
          focus: { type: "string", description: "이 관점이 의심하는 구체 지점" },
        },
      },
    },
    notes: { type: "string", description: "증상에서 이 관점들을 고른 근거" },
  },
};

const HYPOTHESES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["hypotheses"],
  properties: {
    hypotheses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "cause", "perspective", "evidenceExpected", "refuteSignal"],
        properties: {
          title: { type: "string", description: "가설 한 줄 요약" },
          cause: { type: "string", description: "원인 가설 상세(무엇이 어떻게 증상을 일으키는가)" },
          perspective: { type: "string", description: "이 가설이 나온 관점(자유탐색이면 'free')" },
          evidenceExpected: { type: "string", description: "이 가설이 맞다면 코드/로그에서 보일 근거" },
          refuteSignal: { type: "string", description: "이 가설이 틀렸다면 보일 반증 신호" },
        },
      },
    },
  },
};

const VERIFY_SOLVE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "reason", "refinedCause", "solutions"],
  properties: {
    verdict: {
      type: "string",
      enum: ["confirmed", "uncertain", "rejected"],
      description: "confirmed=근거 확인, uncertain=일부라도 코드로 뒷받침(통과), rejected=명백히 틀림 또는 근거 전무+반증 우세",
    },
    reason: { type: "string", description: "코드를 Read 해 확인한 판정 근거(근거 인용)" },
    refinedCause: { type: "string", description: "검증으로 구체화된 원인(통과 시). rejected 면 빈 문자열" },
    solutions: {
      type: "array",
      description: "통과(confirmed/uncertain) 시 근본 원인 직접 제거 정도가 높은 순으로 정렬한 해결책 후보(최대 2). rejected 면 빈 배열",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["approach", "mechanism", "changeScope"],
        properties: {
          approach: { type: "string", description: "해결 접근 한 줄" },
          mechanism: { type: "string", description: "이 접근이 원인을 어떻게 제거하는가" },
          changeScope: { type: "string", description: "대략의 수정 범위(파일·함수)" },
        },
      },
    },
  },
};

const ADVERSARIAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lenses"],
  properties: {
    lenses: {
      type: "array",
      minItems: LENSES.length,
      description: "각 적대검증 관점의 판정 (LENSES 4개 전부, 관점마다 1개 항목)",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["lens", "pass", "critical", "reason", "revisedNote"],
        properties: {
          lens: { type: "string", description: "이 판정의 관점 이름" },
          pass: { type: "boolean", description: "이 관점에서 해결책이 통과하는가(true=문제없음)" },
          critical: {
            type: "boolean",
            description: "발견한 결함이 치명적인가(회귀 유발·인과 불성립은 true). pass=true 면 false",
          },
          reason: { type: "string", description: "코드 확인 기반 판정 근거" },
          revisedNote: { type: "string", description: "결함 있으면 교정 제안. 없으면 빈 문자열" },
        },
      },
    },
  },
};

// ── 단계별 프롬프트 ────────────────────────────────────────────
const verifySolvePrompt = (h) => `문제: ${problem}

${PRINCIPLES}

너의 일: 아래 원인 가설을 실제 코드를 Read 해 검증하고(관대 기준), 통과하면 같은 코드 근거 위에서 해결책까지 도출하라.

1) 검증:
- confirmed: 코드에서 근거를 확인함.
- uncertain: 근거가 부분적·애매하지만 코드에서 일부라도 뒷받침됨 — 통과시킴(이후 적대검증이 거른다).
- rejected: 코드로 보아 '명백히 틀린' 경우, 또는 코드에서 근거가 전혀 확인되지 않고 반증신호가 우세한 경우. 단 코드에서 일부라도 뒷받침되면 기각하지 말고 uncertain(진짜 원인이면 코드에 근거가 남으므로, '근거 전무'만 기각해 누락을 막는다).
- 판정 근거(reason)에 확인한 코드 위치·내용을 인용. 통과면 refinedCause 에 구체화된 원인을 적을 것.

2) 해결책(rejected 가 아닐 때만):
- 검증하며 확인한 코드 근거 위에서, 근본 원인을 가장 직접적으로 제거하는 정도가 높은 순으로 정렬해 해결책 후보를 최대 2개, 서로 접근이 다르게.
- 각 후보에 approach·mechanism(원인을 어떻게 제거하나)·changeScope(수정 범위) 채움.
- 과도한 설계(over-engineering)·증상만 가리는 임시방편은 피할 것.
- rejected 면 solutions 를 빈 배열로 둘 것.

가설:
- 제목: ${h.title}
- 원인: ${h.cause}
- 관점: ${h.perspective}
- 예상 근거: ${h.evidenceExpected}
- 반증 신호: ${h.refuteSignal}`;

const adversarialPrompt = (h, verdict, sol) => `문제: ${problem}

${PRINCIPLES}

너의 일: 아래 (원인 가설 + 해결책) 쌍을 다음 4개 관점 각각에서 적대적으로 공격하라. 기본 입장은 '이 해결책은 결함이 있다'로 두고 약점을 찾을 것. 각 관점을 서로 끌려가지 말고 독립적으로 판정해 lenses 배열로 반환(관점마다 1개 항목).

관점:
${LENSES.map((l) => `- ${l.title}: ${l.focus}`).join("\n")}

각 관점 판정:
- pass=false 로 둘 결함을 찾으면 reason 에 코드 근거와 함께 적고, 치명적(회귀 유발·인과 불성립 등)이면 critical=true. 교정안이 있으면 revisedNote 에.
- 그 관점에서 결함이 없으면 pass=true, critical=false, revisedNote="".

원인 가설: ${h.title} — ${verdict?.refinedCause || h.cause}
해결책: ${sol.approach} / ${sol.mechanism} (수정 범위: ${sol.changeScope})`;

// ── [Hypothesize] 관점 생성 → 관점별 병렬 추출 + 자유탐색 → 중복제거 ──
phase("Hypothesize");

const perspectivePlan = await agent(
  `문제: ${problem}

${PRINCIPLES}

너의 일 (디버깅 1단계 — 의심 관점 도출). 위 증상을 보고, 원인을 찾을 때 서로 겹치지 않는 '의심 관점(범주)'을 도출하라.
- 증상 성격에 맞춰 동적으로 고를 것. 예시 범주: ${PERSPECTIVE_EXAMPLES}. (예시일 뿐 — 증상에 맞게 가감)
- 각 관점에 key, title, focus(이 관점이 의심하는 구체 지점)를 채울 것.
- 보통 3~6개. 증상을 좁게 가리키면 적게, 막연하면 넓게.
- 관점 선정 근거를 notes 에.`,
  { label: "perspectives", phase: "Hypothesize", schema: PERSPECTIVES_SCHEMA },
);

if (!perspectivePlan) throw new Error("[Hypothesize/perspectives] 관점 도출 에이전트 실행 실패(null) — 중단.");
const PERSPECTIVES = (perspectivePlan.perspectives ?? []).filter(Boolean);
if (PERSPECTIVES.length === 0) throw new Error("의심 관점을 도출하지 못했습니다.");
log(`관점 ${PERSPECTIVES.length}개: ${PERSPECTIVES.map((p) => p.title).join(", ")}`);

const extractTasks = PERSPECTIVES.map((p) => () =>
  agent(
    `문제: ${problem}

${PRINCIPLES}

너의 일: 오직 '${p.title}' 관점에서만 원인 가설을 발굴하라. 이 관점의 의심 지점: ${p.focus}
- 코드베이스를 Grep/Glob/Read 로 직접 조사해 이 관점에 해당하는 원인 후보를 가능한 한 빠짐없이 뽑을 것(재현율 우선).
- 다른 관점의 원인은 무시(중복은 이후 단계가 정리).
- 각 가설에 title·cause·perspective('${p.title}')·evidenceExpected·refuteSignal 을 채울 것.
- 해당 관점에서 원인이 안 보이면 hypotheses 를 비울 것(억지 생성 금지).`,
    { label: `extract:${p.key}`, phase: "Hypothesize", schema: HYPOTHESES_SCHEMA },
  ),
);

const freeTask = () =>
  agent(
    `문제: ${problem}

${PRINCIPLES}

너의 일: 어떤 정해진 관점에도 매이지 말고 자유롭게 원인 가설을 발굴하라(사각지대 안전망).
- 앞서 정한 관점 목록(${PERSPECTIVES.map((p) => p.title).join(", ")})에 잘 안 들어가는 원인일수록 가치가 크다.
- 코드베이스를 직접 조사해 근거 기반으로 뽑을 것. 각 가설에 title·cause·perspective('free')·evidenceExpected·refuteSignal 채움.`,
    { label: "extract:free", phase: "Hypothesize", schema: HYPOTHESES_SCHEMA },
  );

const extracted = await parallel([...extractTasks, freeTask]);
assertNoFailures(extracted, "Hypothesize/extract", [...PERSPECTIVES.map((p) => `extract:${p.key}`), "extract:free"]);
const rawHypotheses = extracted.flatMap((r) => r.hypotheses ?? []);
if (rawHypotheses.length === 0) {
  throw new Error("원인 가설을 하나도 도출하지 못했습니다. 문제 설명을 보강해 재호출하세요.");
}

const dedup = await agent(
  `아래는 여러 관점에서 발굴된 원인 가설들이다(JSON). 의미 기준으로 병합·중복제거하라.

병합 규칙:
- '같은 근본 원인'을 가리키는 가설끼리만 하나로 합칠 것(표현만 다른 중복 제거). 근본 원인이 다르면 절대 합치지 말 것(서로 다른 원인을 뭉개면 검증에서 통째 탈락한다).
- 병합 시 evidenceExpected·refuteSignal 은 합쳐 보존. perspective 는 합쳐진 관점들을 표기.
- 개수를 인위적으로 줄이지 말 것(재현율 우선). 진짜 중복만 제거.

가설들(JSON):
${JSON.stringify(rawHypotheses)}`,
  { label: "dedup", phase: "Hypothesize", schema: HYPOTHESES_SCHEMA },
);

if (!dedup) throw new Error("[Hypothesize/dedup] 중복제거 에이전트 실행 실패(null) — 중단.");
const HYPOTHESES = (dedup.hypotheses ?? []).filter(Boolean);
if (HYPOTHESES.length === 0) throw new Error("중복제거 후 남은 가설이 없습니다.");
log(`가설 ${HYPOTHESES.length}개 (원시 ${rawHypotheses.length}개에서 병합)`);

// ── 비용 상한: 곱셈이 시스템 상한(1000) 근접 시 사전 throw ───────
// 가설은 안 자른다(누락 방지). 전체 곱셈이 상한 근접하면 통째 throw 로 보고.
const EST_PER_HYP = 1 /*verify+solve 통합*/ + 2 /*adversarial: 해결책 후보당 1(4관점 통합)*/;
const EST_AGENTS = HYPOTHESES.length * EST_PER_HYP;
const SAFE_AGENT_LIMIT = 900;
if (EST_AGENTS > SAFE_AGENT_LIMIT) {
  throw new Error(
    `가설 ${HYPOTHESES.length}개 × 단계 ≈ ${EST_AGENTS} 에이전트로 시스템 상한(1000) 근접. 가설을 자르면 중요한 원인이 누락될 수 있으니, 문제 설명을 더 좁혀 재호출하세요.`,
  );
}

// ── [Verify(+Solve)]→[Adversarial] 가설별 파이프라인 (무배리어) ──
phase("Verify");
const piped = await pipeline(
  HYPOTHESES,
  // stage1: 검증+해결책 통합 (한 에이전트가 검증하며 읽은 코드로 바로 해결책까지)
  (h, _h, i) =>
    agent(verifySolvePrompt(h), { label: `diagnose:${i}`, phase: "Verify", schema: VERIFY_SOLVE_SCHEMA }).then((v) => ({
      index: i,
      hypothesis: h,
      verdict: { verdict: v.verdict, reason: v.reason, refinedCause: v.refinedCause },
      solutions: v.verdict === "rejected" ? [] : (v.solutions ?? []).slice(0, 2),
    })),
  // stage2: 적대검증 (해결책별 fan-out, 4관점은 단일 에이전트가 1회 통합 판정)
  (prev, h, i) => {
    // stage1 실패(null)는 복구하지 말고 그대로 전파 → line 320 assertNoFailures(piped) 가 포착(fail-fast).
    if (!prev) return null;
    // 여기부터 prev 는 비-null 보장 → verdict 보존됨(정상 무해결책만 빈 judged 로 통과).
    if (!prev.solutions || prev.solutions.length === 0) return Promise.resolve({ ...prev, judged: [] });
    return parallel(
      prev.solutions.map((sol, si) => () =>
        agent(adversarialPrompt(h, prev.verdict, sol), {
          label: `adv:${i}:${si}`,
          phase: "Adversarial",
          schema: ADVERSARIAL_SCHEMA,
        }).then((v) => ({ solution: sol, lensResults: (v?.lenses ?? []).filter(Boolean) })),
      ),
    ).then((judged) => {
      assertNoFailures(judged, `Adversarial(가설#${i})`, prev.solutions.map((_, si) => `adv:${i}:${si}`));
      return { ...prev, judged };
    });
  },
);

// ── 집계: 검증 기각 분리 + 해결책 veto+다수결 판정 ──────────────
// fail-fast: stage1(diagnose) reject 또는 stage2(adversarial) 실패로 null 이 된 가설이 하나라도 있으면 중단.
assertNoFailures(piped, "Verify/Adversarial", HYPOTHESES.map((h) => h.title));
const results = piped;
const droppedH = results.filter((x) => x.verdict?.verdict === "rejected");
const survivedH = results.filter((x) => x.verdict && x.verdict.verdict !== "rejected");

function judgeSolution(j) {
  const lr = (j.lensResults ?? []).filter(Boolean);
  const veto = lr.some((l) => l.critical === true && l.pass === false); // 치명결함 1표면 기각
  const passVotes = lr.filter((l) => l.pass === true).length;
  const total = lr.length;
  const passed = !veto && total > 0 && passVotes > total / 2; // veto 없으면 통과 다수결
  const risks = lr.filter((l) => l.pass === false).map((l) => `[${l.lens}] ${l.reason}`);
  const revisions = lr.filter((l) => l.revisedNote && l.revisedNote.trim() !== "").map((l) => `[${l.lens}] ${l.revisedNote}`);
  return { passed, veto, passVotes, total, risks, revisions };
}

const survivedDetailed = survivedH.map((x) => {
  const sols = (x.judged ?? []).map((j) => ({ solution: j.solution, ...judgeSolution(j) }));
  return {
    hypothesis: x.hypothesis,
    verdict: x.verdict.verdict,
    verifyReason: x.verdict.reason,
    refinedCause: x.verdict.refinedCause,
    solutions: sols,
    passedSolutions: sols.filter((s) => s.passed),
  };
});

const solutionsPassed = survivedDetailed.reduce((n, x) => n + x.passedSolutions.length, 0);
const noSolution = solutionsPassed === 0;

// 병합·우선순위화·렌더·결정 진행은 호출측(SKILL.md/메인 루프)이 수행.
// 워크플로는 검증·적대검증 완료된 가설+해결책(평탄화) + 기각 가설을 구조화 반환.
return {
  problem,
  perspectives: PERSPECTIVES.map((p) => p.title),
  summary: {
    hypotheses: HYPOTHESES.length,
    confirmed: survivedH.filter((x) => x.verdict.verdict === "confirmed").length,
    uncertain: survivedH.filter((x) => x.verdict.verdict === "uncertain").length,
    dropped: droppedH.length,
    solutionsPassed,
    noSolution,
  },
  survived: survivedDetailed.map((x) => ({
    hypothesis: x.hypothesis.title,
    cause: x.refinedCause || x.hypothesis.cause,
    perspective: x.hypothesis.perspective,
    verdict: x.verdict,
    verifyReason: x.verifyReason,
    solutions: x.solutions.map((s) => ({
      approach: s.solution.approach,
      mechanism: s.solution.mechanism,
      changeScope: s.solution.changeScope,
      passed: s.passed,
      vetoed: s.veto,
      votes: `${s.passVotes}/${s.total}`,
      risks: s.risks,
      revisions: s.revisions,
    })),
  })),
  dropped: droppedH.map((x) => ({
    hypothesis: x.hypothesis.title,
    cause: x.hypothesis.cause,
    reason: x.verdict.reason,
  })),
};
