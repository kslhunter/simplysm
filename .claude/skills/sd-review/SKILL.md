---
name: sd-review
description: 산출물(코드·문서 등)을 도메인 자동판정 후 적용 룰을 전수·적대적으로 검증해 [자동]/결정 분류로 보고하는 멀티에이전트 리뷰. Use when 사용자가 리뷰 혹은 검토를 요청할 때.
---

# sd-review

리뷰 요청 시 멀티에이전트 워크플로(`workflow.js`)에 전수·적대적 검증을 위임하고, 그 검증 통과분을 메인 루프가 병합·분류·적용·결정 처리.

## 절차

1. **리뷰 대상 확정** — 사용자가 지정한 대상(파일 경로·디렉터리·코드·문서·자연어 설명) 확정. 모호하면 사용자에게 묻기.

2. **워크플로 실행** — Workflow 도구로 이 스킬의 `workflow.js` 실행:
   - `Workflow({ scriptPath: ".claude/skills/sd-review/workflow.js", args: <리뷰 대상> })`.
   - `args` 는 1단계에서 확정한 대상 (경로 문자열·경로 배열·자연어 설명 중 무엇이든).
   - 대상 식별·도메인 판정·룰 발견·차원 도출·전수 대조·적대 검증은 워크플로가 자율 수행. 반환은 검증 통과분 `survived[]`.

3. **병합·중복제거** — `survived[]` 에서 같은 위치(`file`:`line`)·같은 본질 이슈가 여러 차원에서 중복 제기된 항목은 하나로 병합(룰 인용은 합쳐 표기). 위치·이슈가 다르면 별개로 유지.

4. **[자동]/결정 분류** — 워크플로가 산정해 반환한 `survived[].category` 값을 그대로 사용해 `[자동]`(`category`=`자동`)/결정 대상(`category`=`결정`)으로 묶음. 분류 기준은 workflow.js 가 단일 소스로 가지므로 메인 루프에서 재정의·재판정하지 않음.

   - `verdict` 가 `uncertain` 인 항목은 (워크플로가 이미 `category`=`결정` 으로 산정함) 결정 진행 시 불확실 사유를 함께 명시.
   - `fix_verdict` 가 `risky`·`flawed`·`uncertain` 인 항목은 `fix_assessment` 요약을 함께 적어 주의 환기.

5. **[자동] 적용** — `[자동]` 분류 항목을 각 `file`·`line`·`fix` 대로 즉시 편집 적용. 0건이면 생략.

6. **결정 진행** — 결정 대상이 1건 이상이면 행동 규칙 "사용자 질의 시" 의 결정 진행 모드로 전환 (각 항목의 `title`·`rule`·`evidence`·`fix` 를 근거로). 0건이면 7단계로.

7. **보고** — `summary`(단위·차원·total·confirmed/uncertain/rejected·survived 수) 와 `[자동]`/결정 분류 결과, `rejected[]`(검증 탈락분) 을 정리해 사용자에게 제시.

   - 워크플로가 에러(throw)로 끝나면 에이전트 일부가 실패해 검증이 미완료된 것(fail-fast — 부분 결과를 반환하지 않음). 이때는 "위반 없음(clean pass)" 으로 보고하지 말고 실패 사실을 알린 뒤 resume 로 재실행. 정상 반환이면 전 차원·전 발견이 검증 완료된 것이므로 `survived` 를 그대로 신뢰.

## 워크플로 반환 구조

- `survived[]`: 적대 검증 통과 발견. 각 항목 `{ dimension, title, file, line, severity, category, rule, evidence, fix, fix_verdict, fix_assessment, verdict, verifyReason }`.
- `summary`: 집계 수치(units·dimensions·total·confirmed·uncertain·rejected·survived). 워크플로는 fail-fast — 에이전트가 하나라도 실패하면 부분 결과 없이 throw 하므로, 정상 반환된 `summary` 는 항상 전 차원·전 발견 검증 완료를 의미.
- `rejected[]`: 적대 검증에서 기각된 발견 `{ dimension, title, file, line, reason }`.
- `plan`: 단위·차원·룰 발견 근거 `{ units: [{ path, domain }], dimensions: [{ key, title, ruleSources }], notes }` (반환 `dimensions` 는 내부값에서 `focus`·`units` 제외).
