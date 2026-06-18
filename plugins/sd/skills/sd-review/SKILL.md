---
name: sd-review
description: 산출물(코드·문서 등)을 도메인 자동판정 후 적용 룰을 전수·적대적으로 검증해 [자동]/결정 분류로 보고하는 멀티에이전트 리뷰. Use when 사용자가 sd-review 스킬을 직접 지정해 호출할 때만 사용 (자동 트리거 금지).
---

# sd-review

리뷰 요청 시 메인 루프가 직접 오케스트레이션. 계획을 직접 세운 뒤, 대상 규모에 따라 차원별 전수 룰 대조와 발견별 적대 검증을 서브에이전트(Agent 도구)로 펼치거나 직접 수행하고, 검증 통과분을 병합·분류·적용·결정 처리.

## 검증 원칙 (전 단계 공통)

리뷰·검증 서브에이전트에 항상 주입하고, 메인 루프가 직접 수행할 때도 동일하게 적용:

- 표본·대표 패턴만 보지 말고 모든 단위(코드: 함수·라인 / 문서: 섹션·문장)를 인용한 룰 항목 전체에 빠짐없이 대조.
- 발견 항목은 (위치 + 위반한 룰 원문 인용 + 코드/문장 근거)를 반드시 갖출 것. 근거 없는 추측·일반론·개인 취향 지적 금지.
- 적용 룰의 출처는 (a) 컨텍스트에 자동 주입된 프로젝트/글로벌 지침(설계룰·행동 규칙 등) 과 (b) 발견·전달된 룰 파일 뿐. 그 밖의 임의 기준으로 지적 금지.

**분류(category) 기준**:

- `자동` = 오타·맞춤법·띄어쓰기·조사 오용·들여쓰기/줄바꿈 통일·trailing whitespace·세미콜론·중복 제거 등 순수 형식 정리, 또는 변경 전후 의미·적용 범위가 동일함이 명백한 표현 정리.
- `결정` = 위 `자동` 어디에도 해당하지 않는, 의미·적용 범위가 조금이라도 변동될 가능성이 있는 모든 항목.

**심각도(severity)**: `error`=동작 결함·데이터 정합성·룰 명백 위반, `warn`=권고 위반·잠재 위험, `info`=경미·형식.

## 절차

### 1. 리뷰 대상 확정

사용자가 지정한 대상(파일 경로·디렉터리·코드·문서·자연어 설명) 확정. 모호하면 사용자에게 묻기.

### 2. 계획 수립 (메인 루프 직접)

Glob·Grep·Read 로 직접 수행:

1. **대상 식별** — 구체 리뷰 단위로 확정.
   - 경로/디렉터리면 Glob 으로 파일 수집 (dist/.back/node_modules/.gitignore 등재 경로 제외).
   - 자연어 설명이면 Grep/Glob 으로 산출물을 찾아 단위 확정.
   - 각 단위 경로는 Read 로 직접 접근 가능한 형태로 확보. 사용자가 절대경로(다른 워크스페이스 등)를 줬으면 그대로 보존 — 상대경로로 깎지 말 것. 현재 레포 내부 대상일 때만 레포 기준 상대경로 사용.

2. **도메인 판정** — 각 단위가 어떤 산출물 도메인인지 판정.
   예: "@simplysm v14 화면 컴포넌트", "@simplysm v14 라이브러리/CLI 코드", "ORM/DB 스키마", "LLM 문서(SKILL.md/CLAUDE.md/.claude/rules)", "사람용 문서", "스킬 정의", "spec.md" 등.

3. **적용 룰 동적 발견** — 도메인에 맞는 룰 소스를 실제로 찾아 경로를 적음.
   - 컨텍스트에 자동 주입된 프로젝트/글로벌 지침(설계룰·행동 규칙 등) → `auto-injected: <지침명>` 으로 표기.
   - 가장 가까운 CLAUDE.md (있으면).
   - 도메인 관련 매뉴얼 — SessionStart 가 주입한 활성 references 경로 하위 (예: simplysm 화면이면 `manuals/client-*.md`, `orm.md` 등; 실제 Read/Glob 으로 존재 확인).
   - 도메인 관련 스킬 정의 (예: spec.md 면 `sd-spec`, 매뉴얼이면 `sd-manual`).
   - "기존 동종 산출물 패턴" 자체도 룰 소스 → `existing-pattern` 표기 (코드베이스 비교).

4. **리뷰 차원 도출 (분할 축 자율 결정)** — 대상 규모(단위 수·파일 크기·룰 도메인 수)를 먼저 가늠한 뒤 가장 효율적인 분할 축을 택해 차원 구성.
   - 룰축: 파일 적고 룰 도메인 많음 → 차원 = 룰 묶음, units = 전체 단위.
   - 파일축: 파일 많고 룰 도메인 적음 → 차원 = 파일(또는 클러스터), ruleSources = 적용 룰 전체.
   - 매트릭스: 파일도 많고 룰 도메인도 많은 대규모 → 파일 클러스터 × 룰 묶음 조합.
   - 각 차원에 key·title·ruleSources(실제 경로/표기)·units(검사할 단위 경로)·focus 부여.
   - 불변식: (a) 모든 (단위 × 적용 룰) 조합이 정확히 한 차원에서 빠짐없이 커버 — 누락·중복 금지, (b) 한 차원 컨텍스트 과부하 방지, (c) 차원 수 보통 3~8개.

### 3. 규모 판단 → 펼침 여부 결정

계획을 바탕으로 Review·Verify 를 서브에이전트로 펼칠지 직접 할지 판단:

- **Review**: 차원이 2개 이상이거나 단위 파일이 많아 한 컨텍스트에 다 읽으면 과부하 → 차원마다 Agent 펼침. 차원 1개·소형이면 메인 루프가 직접 전수 대조.
- **Verify**: 적대 검증의 독립성(발견자 ≠ 검증자)이 핵심. **발견이 1건이라도 검증은 독립 Agent 로 수행함이 기본** — 메인 루프는 발견자이므로 자기검증 편향을 피해야 함. 발견이 다수면 발견마다 Agent 병렬. 예외: 대상이 극히 작고 발견이 명백한 형식 항목(자동 분류)뿐이면 직접 가능.
- 서브에이전트 다수를 펼칠 때는 **한 메시지에 Agent 호출을 여러 개** 넣어 동시 실행. `subagent_type` 은 general-purpose (전수 Read·판정 필요).

### 4. Review — 전수 룰 대조

각 차원에 대해 (Agent 또는 직접) 아래를 수행. Agent 로 펼칠 때 프롬프트:

```
[검증 원칙 주입]

리뷰 차원: <title>
검사 초점: <focus>

적용할 룰 소스(존재 파일은 전부 Read; auto-injected/existing-pattern 는 컨텍스트·코드베이스 조사로 처리):
- <ruleSources...>

리뷰 단위(전부 Read 로 끝까지):
- <units...>

위 룰 소스를 단위 전체에 전수 대조해 위반을 보고. 각 발견에 아래 필드를 채울 것.
위반 없으면 "발견 없음" 으로 반환.

발견 형식(항목마다):
- title: 한 줄 요약
- file: 파일 경로 또는 basename
- line: 라인/섹션 번호 또는 범위
- severity: error|warn|info
- category: 자동|결정
- rule: 위반한 룰 출처 + 원문 인용
- evidence: 코드/문장 근거 인용
- fix: 제안 수정
```

전 차원의 발견을 수집해 합침.

### 5. Verify — 발견별 적대적 검증

발견이 0건이면 생략(7단계로). 1건 이상이면 각 발견을 (독립 Agent 가 기본) 적대 검증. Agent 프롬프트:

```
[검증 원칙 주입]

다음은 리뷰에서 제기된 발견 항목이다. 두 가지를 모두 적대적으로 검증하라.

[1] 발견(문제) 검증: 인용된 룰이 실제로 그렇게 규정하는지, 대상이 실제 그 위치에서 그러한지 파일을 직접 Read 하여 확인. 과장·오인·룰 오인용이면 verdict=rejected, 불명확하면 uncertain, 사실이면 confirmed. 의심스러우면 기각 쪽. final_severity/final_category 재산정.

[2] 해결책(제안 수정) 검증: 제안 수정을 공격적으로 따져라 —
  - 실제로 그 문제를 해결하는가,
  - 새 룰 위반·회귀를 만들지 않는가,
  - 엣지케이스(결측 null/undefined, 동시성/트랜잭션, soft delete 동명 레코드, 권한 분기, 타입/스키마 제약 등)에서 깨지지 않는가,
  - 과도(over-engineering)하거나 틀린 접근은 아닌가.
  대상 코드·스키마·룰을 직접 확인해 판정. 결함이 있으면 fix_verdict=flawed/risky 로 두고 교정안 제시. 건전하면 fix_verdict=sound 로 두고 원안 재기술.
  발견이 rejected 면 [2] 생략 가능 — fix_verdict=uncertain, fix_revised="".

발견 항목:
- 제목: <title>
- 위치: <file> (<line>)
- 심각도(제안): <severity>
- 분류(제안): <category>
- 위반 룰: <rule>
- 근거: <evidence>
- 제안 수정: <fix>

리뷰 단위 경로:
- <units...>

해당 파일·스키마·룰 소스를 Read 하여 직접 대조 후 판정.

판정 형식:
- verdict: confirmed|rejected|uncertain
- reason: 룰 원문과 대상을 재확인한 판정 근거
- final_severity: error|warn|info
- final_category: 자동|결정
- fix_verdict: sound|risky|flawed|uncertain
- fix_assessment: 해결책이 문제를 실제 해결하는지, 새 룰 위반·회귀·엣지케이스를 유발하는지 근거
- fix_revised: flawed/risky 면 교정된 해결책; sound 면 원안 재기술; 발견 rejected 면 빈 문자열
```

**fail-fast**: 펼친 Agent 중 하나라도 실패(에러)하면 부분 결과로 진행 금지. "위반 없음" 으로 보고하지 말고 실패 사실을 알린 뒤 해당 Agent 만 재실행해 보완. 전건 정상 반환이어야 전 차원·전 발견 검증 완료로 간주.

### 6. survived 산정

검증 결과를 모아 통과분(survived)을 산정:

- `verdict` = `confirmed` 또는 `uncertain` 인 발견만 survived 로 채택. `rejected` 는 제외(보고용 rejected[] 로 분리).
- survived 각 항목의 값:
  - `severity` = 검증의 `final_severity`.
  - `category` = `verdict`=`uncertain` 이면 무조건 `결정`, 아니면 검증의 `final_category`.
  - `fix` = `fix_revised` 가 비어있지 않으면 그 값, 아니면 원안 `fix`.
  - `fix_verdict`·`fix_assessment`·`verifyReason`(검증 reason) 보존.

### 7. 병합·중복제거

survived 에서 같은 위치(`file`:`line`)·같은 본질 이슈가 여러 차원에서 중복 제기된 항목은 하나로 병합(룰 인용은 합쳐 표기). 위치·이슈가 다르면 별개로 유지.

### 8. [자동]/결정 분류

survived 의 `category` 로 묶음:

- `category`=`자동` → `[자동]`.
- `category`=`결정` → 결정 대상.
- `verdict`=`uncertain` 항목은 결정 진행 시 불확실 사유를 함께 명시.
- `fix_verdict` 가 `risky`·`flawed`·`uncertain` 인 항목은 `fix_assessment` 요약을 함께 적어 주의 환기.

### 9. [자동] 적용

`[자동]` 분류 항목을 각 `file`·`line`·`fix` 대로 즉시 편집 적용. 0건이면 생략.

### 10. 결정 진행

결정 대상이 1건 이상이면 행동 규칙 "사용자 질의 시" 의 결정 진행 모드로 전환 (각 항목의 `title`·`rule`·`evidence`·`fix` 를 근거로). 0건이면 11단계로.

### 11. 보고

집계(단위·차원·total·confirmed/uncertain/rejected·survived 수) 와 `[자동]`/결정 분류 결과, rejected[](검증 탈락분: dimension·title·file·line·reason)를 정리해 사용자에게 제시.
