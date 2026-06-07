---
name: sd-debug
description: 버그·실패·예외의 원인을 다관점으로 발굴하고 가설별 검증·해결책·적대검증을 거쳐 검증된 해결책을 제안하는 멀티에이전트 디버깅. Use when 버그·예외·실패의 근본 원인 분석과 해결책이 필요할 때.
---

# sd-debug

디버깅 요청 시 멀티에이전트 워크플로(`workflow.js`)에 원인 발굴·검증·적대검증을 위임하고, 그 결과를 메인 루프가 사용자에게 제시·결정 처리.

## 절차

1. **문제 확정** — 증상·기대동작·관찰결과를 확정.
   - 대화 중 오류를 논의하다 진입했으면, 그때까지의 맥락(증상·에러·스택·시도·관찰)을 요약해 문제 설명으로 합성.
   - 에러 메시지·스택·재현조건·관련 코드 경로·환경은 있으면 함께 모음(선택).
   - 문제 설명조차 불명확하면 사용자에게 묻기.

2. **워크플로 실행** — Workflow 도구로 이 스킬의 `workflow.js` 실행:
   - `Workflow({ scriptPath: ".claude/skills/sd-debug/workflow.js", args: <문제 설명> })`.
   - `args` 는 1단계의 문제 설명(자연어 문자열 또는 `{ problem, error, repro, paths, env }` 객체).
   - 관점 도출·가설 발굴·검증·해결책 탐색·적대검증·병합은 워크플로가 자율 수행.

3. **병합·우선순위화** — 반환값 `survived[]` 를 메인이 직접 정리:
   - 같은 근본 원인의 가설이 중복되면 병합.
   - 각 가설의 해결책 중 `passed: true` 인 것을 채택하되 `revisions`(교정)를 반영하고 `risks` 는 잔존 리스크로 보존.
   - (검증 confidence: confirmed>uncertain) + (적대검증 통과 강도 `votes`) + (원인-증상 직접성)으로 우선순위 정렬.

4. **결과 렌더** — 행동 규칙 "문제 발생 시" 의 3블록으로 제시:
   - 원인 가설: `survived[].hypothesis`·`cause` (+ `dropped[]` 로 기각된 가설과 사유).
   - 검증: 각 항목의 `verdict`·`verifyReason` (uncertain 은 "근거 약함" 으로 표시).
   - 해결책: 채택한 해결책(교정 반영) + 잔존 리스크.

5. **결정 진행** — 채택 해결책 후보가 1건 이상이면 행동 규칙 "사용자 질의 시" 의 결정 진행 모드로 전환(우선순위 순). 사용자가 고른 해결책만 실제 수정에 착수.

6. **미해결 보고** — `summary.noSolution` 이면(검증된 해결책 0건) `survived[]` 의 가설·탈락 사유와 `dropped[]` 를 제시해 다음 수동 디버깅의 출발점으로 삼게 함.

## 워크플로 반환 구조

- `survived[]`: `{ hypothesis, cause, perspective, verdict, verifyReason, solutions }` — 검증 통과 가설.
  - `solutions[]`: `{ approach, mechanism, changeScope, passed, vetoed, votes, risks, revisions }` — `passed: true` 가 채택 후보.
- `dropped[]`: `{ hypothesis, cause, reason }` — 검증에서 기각된 가설과 사유.
- `summary`: 집계(가설 수·confirmed/uncertain·dropped·solutionsPassed·noSolution).
- `perspectives`: 사용한 의심 관점 목록.
- `problem`: 입력 문제 요약.
