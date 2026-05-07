---
name: sd-impl
description: plan.md를 따라 실제 코드를 작성하고 변경 결과를 impl.md로 기록하는 스킬. Use when plan 단계 후 실제 구현이 필요할 때 (human-in-the-loop, 평소 자동·막힘 시만 사용자 개입)
---

# implement 단계

plan.md 따라 코드 작성. 평소 자동, 막힘 시만 사용자 개입(human-in-the-loop).
**커밋 안 함** (사용자 정책 — 병렬 작업 충돌 방지).

## 산출물

```
.specs/{yyMMdd_HHmmss}/REQ-XXX-슬러그/
  spec.md / plan.md   ← 입력
  impl.md             ← 본 단계 산출물
+ 코드 변경 (uncommitted)
```

## 워크플로

1. 입력: 대상 REQ ID

2. 읽기: plan.md + spec.md + 코드베이스

3. plan.md 권장 순서대로 R 단위 순차 진행 (병렬 X)

4. 각 R마다 (자동 진행, 사용자 개입 X):
   - 모드별 표준 흐름 적용 (TDD/사후/생략) — [references/modes-and-failure.md](references/modes-and-failure.md)
   - **R 끝마다 검증**: 타입체크 + 린트(+fix) + 테스트 (해당 R + 전체 회귀). 빌드는 별도 X (타입체크 + 린트로 갈음).
   - 모두 통과 → impl.md 갱신 (템플릿: [references/impl-md-template.md](references/impl-md-template.md)) → 다음 R
   - 하나라도 실패 → 막힘 처리 ([references/modes-and-failure.md](references/modes-and-failure.md))

5. 모든 R `완료` 도달 → **impl.md 전체 재검토** (R별 변경/테스트/차이/의도 정합성 / plan 대비 누락 / 막힘·보류 잔존 여부 / 회귀 검증 누락) → 신규 이슈 발견 시 해당 R 재진입 → 재검토 후에도 이슈 0개 → **역방향 문서(overview, spec, demo, plan) 검토** → 신규 모순/수정 발견 시 해당 R 재진입 → 정합성 OK → **결과 보고** → 메타 `상태: implemented` 전환
   - 보고: 안내 텍스트라 별도 사용자 승인 게이트 X.

## R 진행 상태 (impl.md)

| 상태 | 의미 |
|---|---|
| 진행중 | 현재 작업 중 |
| 완료 | 검증 통과, impl.md 갱신됨 |
| 막힘 | 자동 시도 후 미해결, 사용자 Q |
| 보류 | plan 모순으로 plan 재진입 필요 |

종료 시점엔 모든 R `완료` 상태. 막힘/보류는 모두 해소되어야.

## 핵심 원칙

- self-contained 블록 (R 블록 안에 변경/테스트/차이/의도 인라인)
- raw input 불변
- ID 불변
- 자동 판단 금지 (모드 변경/스킵 등)
- **human-in-the-loop** (다이얼로그 루프 X, 막힘 시만 Q)

## 안티패턴

- ❌ 커밋 시도 (사용자 정책 위반)
- ❌ implement 단독으로 R 스킵/dropped 결정 (spec/plan 수준)
- ❌ R별 사용자 확인 받기 (human-in-the-loop 위반)
- ❌ 검증 생략하고 다음 R 진행
- ❌ 자동 시도 무한 반복 (N=2 정책)
- ❌ 막힘 시 임의 우회 (사용자 확인 없이)
- ❌ plan.md / spec.md 직접 수정 (plan 재진입 절차)
- ❌ 라인 번호 기반 변경 위치 표기
- ❌ 모든 R 완료 직후 impl.md 전체 재검토 없이 implemented 전환
- ❌ 역방향 검토 없이 implemented 전환
