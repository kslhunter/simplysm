# 구현계획서: sd-check 스킬 개선 및 작업 디렉토리 통일

**참조 문서:** `.plans/260315141209_sd-check-improvement/spec.md` R1
**대상:** `.claude/skills/sd-check/SKILL.md` 수정 + 7개 스킬 경로 치환
**작업 유형:** 비코드 작업 (LLM용 문서) → subagent를 통한 동작 검증 (`_test.md` 작성)

## 작업 분석

두 가지 작업으로 구성되나, 밀접하게 연관되어 하나의 TDD 사이클로 처리:

**작업 A: sd-check SKILL.md 전면 재작성**

- 유지: YAML 헤더, 인자 파싱, 수정 원칙, 완료 안내 형식
- 제거: 이중 루프, Phase 순차 강제, 복잡한 명령어 탐지 테이블
- 추가: check 필수 전제조건, PM 탐지, `.tasks/` 로그 저장, LLM 자율 판단 가이드

**작업 B: 모든 스킬의 `.plans/` → `.tasks/` 경로 치환**

- 대상: sd-spec, sd-plan, sd-plan-dev, sd-audit, sd-debug, sd-test, sd-use (7개 SKILL.md) + .gitignore
- 성격: 단순 문자열 치환

## TDD 계획

### RED Phase: `_test.md` 작성 및 테스트 시나리오 정의

subagent가 SKILL.md를 따라 시뮬레이션할 테스트 시나리오:

| # | 시나리오 | 기대 동작 |
|---|---------|----------|
| T1 | check 스크립트 없는 프로젝트 | 오류 메시지 출력 후 즉시 종료, 코드 수정 시도 없음 |
| T2 | check만 있는 프로젝트 (보조 명령어 없음) | check 실행 → 로그 저장 → 에러 분석 → 코드 수정 → check 재실행 |
| T3 | 모든 스크립트가 있는 프로젝트 | 보조 명령어 탐지 및 표시 + lint 에러 시 lint:fix 활용 가능 |
| T4 | check 에러 후 수정 불가 상황 | 남은 에러 보고 후 종료 (무한 루프 방지) |
| T5 | 수정 후 재실행 | 새 타임스탬프의 로그 파일 생성, 이전 로그와 별개 |
| T6 | 모든 스킬의 `.plans/` 참조 | `.tasks/`로 변경되어 있음 |

### GREEN Phase: 구현

#### 작업 A: sd-check SKILL.md 재작성

새 SKILL.md 구조 (7개 섹션):

1. **인자 파싱** — `$ARGUMENTS`에서 targets 파싱 (현재와 동일)
2. **전제조건 검사** — package.json에 `check` 존재 확인 → 없으면 오류 후 종료. PM 탐지 (lock 파일)
3. **보조 명령어 탐지** — typecheck, lint, lint:fix, test (선택적). 탐지 결과 표시. 없어도 오류 아님
4. **check 실행 및 로그 저장** — `{PM} check {targets}` → `.tasks/{yyMMddHHmmss}_check/check.log` 저장 후 Read
5. **에러 분석 및 자율 수정** — LLM이 자율 판단. 보조 명령어 활용은 예시로 가이드 (강제 아님). 수정 시 4번 재수행, 수정 불가 시 종료
6. **수정 원칙** — 현재 5절 내용 그대로 유지
7. **완료 안내** — check 횟수, 최종 상태, 수정 파일, 미해결 에러, `/sd-commit` 안내

핵심 설계 원칙: 절차 강제 아닌 도구+원칙 제공, LLM 재량에 위임

#### 작업 B: `.plans/` → `.tasks/` 경로 치환

대상 파일과 치환 내용:

| 파일 | 치환 |
|------|------|
| `sd-spec/SKILL.md` | `.plans/` → `.tasks/` |
| `sd-plan/SKILL.md` | `.plans/` → `.tasks/` |
| `sd-plan-dev/SKILL.md` | `.tmp/plans/` → `.tasks/` |
| `sd-audit/SKILL.md` | `.plans/` → `.tasks/` |
| `sd-debug/SKILL.md` | `.plans/` → `.tasks/` |
| `sd-test/SKILL.md` | `.plans/` → `.tasks/` |
| `sd-use/SKILL.md` | `.plans/` → `.tasks/` |
| `.gitignore` | `.plans` → `.tasks` |

구현 후 테스트 재실행하여 통과 확인

### Refactor Phase

`/simplify` 하여 품질 개선 → 테스트 재실행하여 통과 확인
