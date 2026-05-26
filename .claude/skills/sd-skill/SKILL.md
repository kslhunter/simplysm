---
name: sd-skill
description: 사용자가 정의한 작업 도메인을 SKILL.md + (필요 시) scripts 묶음으로 생성·수정한다. Use when 새 스킬을 작성하거나 기존 스킬을 수정할 때.
---

# 스킬 작성

워크플로 = 아래 § 1~6 순서. 처음부터 끝까지 읽으며 그대로 수행.

## 1. 의도 정의

다음 파악. **멀티질문 X — 항목 1건씩 합의** (sd-base-rules):

- 다루는 작업/도메인?
- 커버 유즈케이스?
- 실행 스크립트 필요 / 지침만으로 충분?
- 함께 포함할 참고 자료?

## 2. Eval 시나리오 정의

채점 케이스: `evals/golden.jsonl`. 케이스 초기 워크스페이스: `evals/fixtures/<name>/`.

**주의**: 타 스킬 eval 답습 금지, 아래 룰만 따를 것.

### 자동답변 환경

Eval 실행 시 사용자 응답 불가. 대상 스킬은 입력 필요 시점마다 **스스로 답변**하며 끝까지 진행 (대화 흐름·산출물 형식 검증용). 케이스 설계는 이 제약 전제.

- `input` = 1턴 사용자 발화. 후속 응답 가정 X.
- rubric = 자체 답변 가능 영역만 검증: 산출물 존재/형식/구조·흐름 진행 여부·frontmatter 키 등. *"사용자가 X 를 골랐을 때 Y 가 나오는가"* 처럼 특정 사용자 응답 값 의존 항목 금지 (자체 답변값은 매번 다름).
- **사용자 응답 발생 자체 의존 rubric 금지**: 대상 스킬이 "사용자 질문"·"OPEN 처리/대기"·"임의 채움 금지" 룰 보유해도, 룰 발현 자체는 eval 검증 불가. 자동답변 환경은 사용자 답변 즉시 생성·진행 → "사용자 질문/대기" 흐름 본질적으로 미발생.
  - ❌ `"사용자에게 질문하거나 OPEN 처리하는 흐름이 등장하는가"` (자체 답변으로 채운 뒤 진행 = 위반 아니라 환경 정상 동작)
  - ❌ `"임의 채움 흔적이 없는가"` (자체 답변 자체가 "임의 채움" 으로 보임)
  - 대응: 케이스 재설계 또는 `input` 본문에 룰 강조 명시 (예: "모호 발견 시 OPEN 마커만 spec 에 박고 종료")
- fixture = 자체 답변 미차단되게 구성. 외부 시크릿·실시간 API 없이 진행 가능한 초기 상태로.

### 근거 제약

eval 입력/rubric 의 근거 = **검증 대상 SKILL.md (수정 시: 수정 후 버전) 명세뿐**. 이전 버전 동작·대화 메모리의 옛 컨텍스트 인용 금지.

- 검증 대상 명세에 없는 동작 → 입력·rubric 둘 다 등장 X
- "이전 버전과 다르게 X 하는가" negative rubric 금지. 현재 명세상 X 요구 → `"X 하는가"` 로 직접 검증

### Golden 케이스

`evals/golden.jsonl`, 한 줄 한 케이스:

```json
{"id": "case-001", "input": "/<skill-name> ...", "rubric": ["체크 질문 1", "체크 질문 2"], "fixture": "<fixture-dir-name>"}
```

- `id`: 케이스 식별자
- `input`: 평가 대상 스킬에 전달할 사용자 입력
- `rubric`: PASS/FAIL 판정 체크 질문 목록
- `fixture`: 케이스 시작 시점 샌드박스 초기 상태 디렉토리 이름

**케이스 크기**: 한 케이스 작업량이 단일 실행 컨텍스트 소진 정도로 크면 X. eval = 흐름·산출물 형식 검증 목적 → 풀 구현·대량 분석 요구 input 회피, 최소 시연 수준으로 좁힘. 본질이 큰 풀구현 스킬은 input 의 평가 환경 단서로 rubric 검증에 불필요한 워크플로 단계를 명시 스킵.

### Rubric 작성

각 항목 = **PASS/FAIL 판정 가능한 명확한 체크 질문**. 추상 표현 → judge 판단 흔들림 → 회피.

**모호 부사·형용사 회피** ("잘"·"적절히"·"합리적으로"·"명확히" → 기준이 사람마다 다름):

- ❌ `"한국어 지원이 잘 되었는가?"` ("잘" 모호)
- ✅ `"본문에 한국어 응답 강제 지시가 명시적 문장으로 들어갔는가?"`

**형식 검증 선호** (의미보다 형식·존재 여부 → judge 흔들림 ↓):

- ❌ `"description 이 트리거 조건을 명확히 표현하는가?"`
- ✅ `"description 끝에 'Use when ~' 형식 문장이 포함되었는가?"`

**관찰 가능 산출물에 묶기** (파일 존재·특정 키 포함·특정 디렉토리 구조 등 tree/events 에서 직접 확인 가능한 사실):

- ✅ `"기존 .claude/skills/review/SKILL.md 파일이 손실되지 않고 보존되었는가?"`
- ✅ `"SKILL.md frontmatter 에 name·description 키 모두 존재하는가?"`

**명세 어휘 매칭 금지**: 명세 특정 단어를 rubric 에 그대로 박아 정확 매칭 요구 X. LLM 응답은 동의어·다른 표현으로 동일 본질 전달 → 어휘 정확 매칭 = 본질-무관 FAIL 양산. rubric 은 본질(형식·구조·존재 여부)만 검증.

- ❌ `"분해 표 첫 컬럼이 '항목' 인가"` (LLM 이 'ID'·'식별자' 로 출력해도 본질 동일)
- ✅ `"분해 표가 마크다운 표 형식으로 출력되고 컬럼 6개 모두 존재하는가"`

**도구명 매칭 금지**: "events 에 특정 도구(Glob/Grep/Read 등) 호출이 있는가" 는 그 도구 사용 자체가 본질일 때만. 본질이 "탐색·조사·읽기" 등 행위면 동등 효과의 다른 도구(Bash 의 ls/find/dir/cat 등) 도 PASS.

- ❌ `"events 에 Glob 또는 Grep 호출이 1회 이상 있는가"` (Bash ls/find 로 동등 효과인데 FAIL)
- ✅ `"events 에 코드베이스 탐색 흔적(Glob·Grep 호출 또는 Bash 의 ls/find/dir 등 동등 명령) 이 1회 이상 있는가"`

### Fixtures

`evals/fixtures/<name>/` = 케이스 시작 시점 샌드박스 초기 상태. 케이스 실행 시 통째로 샌드박스 복사.

- **빈 워크스페이스**: 디렉토리만 (`.gitkeep` 등 자리 표시)
- **기존 스킬 수정 케이스**: 그 스킬의 SKILL.md + 관련 파일 미리 배치

예: `with-existing-review/.claude/skills/review/SKILL.md` — 케이스 시작 시 review 스킬 기존 존재 상태.

### 케이스 커버리지

골든 셋이 단순 PASS 외 다음 분기 커버 시 회귀 감지 강화:

- 신규 작성 / 기존 수정 각각
- 워크플로 주요 분기점 (예: 스크립트 필요/불필요, 참조 파일 분리 필요/불필요)
- 과거 실패 패턴 — FAIL 케이스 reason 분석 후 재발 방지용 추가

## 3. 스킬 작성

간결·명확한 SKILL.md + 별도 참고 파일 (필요 시) + 유틸리티 스크립트 (필요 시).

### 디렉토리 구조

```
.claude/
└── skills/
    └── <skill-name>/
        ├── SKILL.md             # 스킬 본문 (필수)
        ├── evals/               # Eval 정의 (필수)
        │   ├── golden.jsonl     # 케이스 목록
        │   └── fixtures/        # 케이스별 초기 워크스페이스
        │       └── <name>/
        ├── references/          # 상세 문서 (선택)
        │   └── *.md
        └── scripts/             # 유틸리티 (선택)
            └── *.py
```

### SKILL.md 템플릿

```markdown
---
name: skill-name
description: 기능 설명. Use when [활용상황]
---

# 스킬 이름

## 워크플로

[단계별 절차]
```

### description

에이전트의 라우팅 진입점. 에이전트가 description 으로 사용자 요청에 맞는 스킬 호출.

**전달 정보**:

- 이 스킬의 목적
- 트리거 맥락 (언제·왜)
- 타 스킬과 구분 단서

**형식**:

- 최대 200자, 한 줄
- 3인칭
- 첫 문장: 입력 → 산출물(또는 효과). 내부 처리 단계 금지.
- 두 번째 문장: "Use when [활용상황]"

**금지**: 내부 단계·알고리즘·사용 도구·로직 흐름 → SKILL.md 본문 워크플로의 몫. description 은 외부 관찰 경계(입력·산출물·트리거)만 노출.

### 스크립트 추가 기준

다음 시 유틸리티 스크립트 추가:

- 동작이 결정론(deterministic)적 (validation·formatting)
- 코드 생성이 매번 동일
- 에러 명시 처리 필요

스크립트 → 토큰 절약 + 안정성 개선.

**작성 원칙**:

- Python(`.py`) 으로 작성
- 내부 에러 처리 X. 에러 즉시 throw.

### 파일 분리 기준

다음 시 별도 파일 분리:

- SKILL.md 분량이 에이전트가 한 자리에서 워크플로 흐름 인식 어려울 만큼 누적
- 명백히 다른 도메인
- 거의 안 쓰는 고급 기능

## 4. Eval 실행

### 명령

`python .claude/skills/sd-skill/scripts/run_eval.py <대상-스킬-이름>`

대상 스킬에 `evals/golden.jsonl` + `evals/fixtures/<fixture-name>/` 필요.

### 동작

케이스마다:

1. 격리 작업 공간 준비 (`.claude/` 복사 + fixture 오버레이)
2. 대상 스킬 실행. `EVAL_MODE_PREFIX` 가 사용자 입력에 prepend 되어, 대상 스킬이 입력 필요 시점마다 스스로 답변하며 끝까지 진행하도록 지시. 자체 답변은 사용자 명시 발언과 동등 취급 (다이얼로그 기반 스킬도 평가 가능, 단 자체 답변이라 흐름·형식 검증용)
3. 에이전트 동작 기록 + 종료 시점 파일 트리 수집
4. 별도 평가 에이전트가 rubric 항목별 PASS/FAIL 채점 → 모두 PASS 시 케이스 PASS

### 출력 구조

stdout: summary JSON

- `run_id`, `results_dir`
- `summary`: total / pass / fail / error
- `cases[]`: 케이스별 verdict + 결과 dir 경로

각 케이스 결과 파일 (`results_dir/cases/<id>/`):

- `judge_output.json` — rubric 항목별 PASS/FAIL + reason
- `events.json` — 에이전트 이벤트 시퀀스
- `tree.json` — 샌드박스 종료 시 파일 트리

## 5. 스킬·Eval 개선

- 보고: 전체 PASS/FAIL 카운트 + FAIL 케이스 목록
- FAIL reason 분석:
  - 결과 파일 (`judge_output.json`·`events.json`·`tree.json`) read
  - 스킬/Eval 어느 쪽 문제인지 판단
  - 모호 시 사용자 질문
- 수정 → 같은 골든 셋 전체 § 4 재실행
- 새 실패 패턴은 골든 셋에 케이스 추가

## 6. 산출물 가독성 점검

eval PASS 후 SKILL.md / references / scripts 재통독: "에이전트가 잘 이해·수행 가능? 중복·꾸밈·과한 예시 없음?"

### 리뷰 체크리스트

- [ ] description 에 트리거 포함? ("Use when ~")
- [ ] description 에 내부 단계·알고리즘·도구 미포함?
- [ ] SKILL.md 분량이 에이전트가 한 자리에서 워크플로 인식 가능?
- [ ] 용어 일관?
- [ ] 구체 예시 포함?
- [ ] 참조 깊이 한 단계? (SKILL.md → references/X.md 까지만. references 파일 안에서 또 다른 파일 참조 X)

**표현·구조 정리만, 의미 변경 X.** 의미 변경 시 § 4 회귀.
