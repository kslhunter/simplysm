# Eval: sd-prompt

## 행동 Eval

### 시나리오 1: 신규 스킬 작성 (Step 1~5 전체 흐름)

- 사전 조건: workspace의 `.claude/`에 sd-prompt 자신과 sd-clarify·기타 기존 스킬은 존재 (`.claude/` 통째 복사). 작성 대상이 될 새 스킬 폴더(`.claude/skills/dir-size/`)는 존재하지 않는다.
- 입력: "/sd-prompt 디렉토리 크기 합산 스킬을 만들어줘. 디렉토리 경로를 입력받아 하위 모든 파일 크기를 합산해 사용자에게 단일 보고를 출력하는 분석 전용 스킬. 트리거: '디렉토리 크기 확인', '폴더 용량 계산', '디스크 사용량 분석'."

- 성공 행동:
  - [ ] 의도 정의 단계에서 유형(스킬), 트리거, 입력, 출력 4요소를 식별·요약한 텍스트가 응답에 등장한다.
  - [ ] 의도 정의 또는 Eval 시나리오 작성 중 미확정 사항이 발생하면 즉시 명확화 절차가 수행된다 (선택지 텍스트 출력 + `**사용자 선택: {값}**` 고정 리터럴 표기).
  - [ ] workspace의 `.claude/skills/{새스킬명}/SKILL.md` 파일이 신규 생성되며, 프론트매터 `name`과 `description`이 모두 작성된다.
  - [ ] SKILL.md의 description이 `{기능 설명}하는 스킬. "{트리거1}", "{트리거2}", "{트리거3}" 등을 요청할 때 사용한다.` 포맷을 만족한다 (큰따옴표로 감싼 트리거 인용이 2개 이상 등장).
  - [ ] SKILL.md 본문에 `## Step N:` 형식의 시간 순서 단계 헤딩이 1개 이상 등장한다.
  - [ ] 같은 폴더에 `SKILL.eval.md` 파일이 신규 생성되며, `## 행동 Eval`과 `## 안티패턴 Eval` 두 섹션이 모두 작성된다.
  - [ ] SKILL.eval.md의 행동 Eval 시나리오 `입력:` 줄이 슬래시 커맨드(`/`로 시작) 형식으로 작성된다.
  - [ ] outer 응답에 Step 4 inner Eval 실행이 시도된 흔적이 있다 (`run-eval.sh` 호출, `.tmp/...` 경로의 inner workspace 생성, 또는 inner `run-output.json` 인용 중 하나 이상).
  - [ ] outer 응답에 inner Eval 판정 결과(PASS/FAIL 결론과 그 근거)가 인용·반영된다.
  - [ ] outer 응답에 Step 5 Smell 탐지 단계가 수행된 흔적이 등장한다 (Smell 카테고리별 탐지 결과 또는 "Smell 없음" 결론).
  - [ ] outer 응답 종료 시점에 최종 PASS 상태와 산출물 경로(SKILL.md, SKILL.eval.md)가 명시된다.

- 보조 assertion:
  - [ ] SKILL.md 본문에 `적절히`, `필요시`, `경우에 따라`, `등등` 같은 모호 표현이 잔존하지 않는다.
  - [ ] SKILL.md 헤딩 레벨이 가이드(`#` 스킬 제목 / `##` Step·공통 규칙 / `###` 절차·참조 항목)를 위반하지 않는다.
  - [ ] SKILL.eval.md의 모든 체크 항목이 `- [ ]` 마크다운 체크박스 형식으로 작성된다.

- Judge rubric:
  - PASS: 새 스킬 폴더 하위에 SKILL.md와 SKILL.eval.md가 신규 생성되고, description 포맷·Step 헤딩·행동/안티패턴 섹션이 모두 충족된다. 의도 4요소 식별 흔적, 의문 발생 시 즉시 명확화 절차 흔적, Step 4 inner Eval 실행 시도 및 결과 반영 흔적, Step 5 Smell 탐지 흔적, 최종 PASS 보고가 outer 응답에 모두 등장한다.
  - FAIL: SKILL.md 또는 SKILL.eval.md 누락 / description 포맷 위반(트리거 인용 2개 미만) / Step 헤딩 부재 / 의문 발생 시 즉시 명확화 미수행 / Step 4 inner Eval 호출 시도 흔적 부재 / Step 5 Smell 탐지 단계 누락 / 최종 PASS 보고 누락 중 하나라도 해당.

## 안티패턴 Eval

모든 시나리오에 공통으로 적용된다.

- [ ] 의도 정의 또는 Eval 시나리오 작성 중 발견된 의문을 명확화 없이 SKILL.md 본문 작성으로 진행하지 않는다.
- [ ] inner Eval에서 FAIL 판정이 나왔는데 수정·재실행 없이 다음 Step으로 진행하지 않는다 (개선 루프 회피 금지).
- [ ] 산출 SKILL.md 본문에 모호 표현(`적절히`, `필요시`, `경우에 따라`, `등등`)이 잔존하지 않는다.
- [ ] 산출 SKILL.md의 description이 description 포맷(트리거 따옴표 인용 ≥ 2개)을 위반하지 않는다.
- [ ] 산출물 파일(SKILL.md 또는 SKILL.eval.md)이 대상 스킬 폴더 외부 경로에 생성되지 않는다.
- [ ] AskUserQuestion 도구를 직접 호출하지 않는다 (Eval 환경 규칙에 따라 텍스트 출력 + `**사용자 선택: {값}**` 고정 리터럴로 처리).
