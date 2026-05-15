---
name: sd-implementation
description: design.md 를 구현하고 검증. Use when Design 단계 후 실제 구현 요청 시
---

# sd-implementation

design.md → 코드 + impl.md + 정방향 검토.

## 산출물

```
.story-maps/{yyMMddHHmmss}_{slug}/TASK-XXX-slug/
  design.md       ← 입력
  impl.md         ← 본 단계 산출물
```

템플릿: [impl](references/impl-md-template.md).

## 워크플로

1. **구현** — design.md 결정 항목 (Solution / Detailed Design / Rollout / 화면 동작 등) 을 체크리스트로 추출 후 각 항목 추종 구현. 다음 셋 중 하나 발생 시 즉시 중단:
   - design 명시 결정의 변경 (단순화 / 등가 / 성능 / 편의 등 self-justification 포함)
   - design 미명시 결정 필요 (추측 금지)
   - design 의무 항목 (Rollout 포함) 누락 처리 (운영 떠넘기기 포함)

   중단 후 절차: 사용자에게 질문 → 답변 수신 → design.md 갱신 (도메인 의미 변경 시 task.md / story-map.md 까지 연쇄 갱신) → 재개. 답변 수신 전 재개 금지. 중단 시 `implemented: pending` 유지.
2. **패키지 레벨 검증** — typecheck / lint / test 전체.
3. **정방향 검토** — design.md 결정 체크리스트 100% 코드 매핑 검증 + story-map.md → task.md → design.md → impl.md → code 일관성 / 변질 / 누락 점검. 발견 시 워크플로 1 중단 절차 회귀.
4. **안내** — 시연 필요 시 시나리오 안내, 아니면 완료 보고. 워크플로 완주 시 `implemented` 를 YYYY-MM-DD 로 갱신.

## 운용

- **커밋 안 함** (사용자 정책 — 병렬 작업 충돌 방지).

## 안티패턴

- 미해결 잔존 상태에서 완결 처리.
- design.md 와 어긋나는 구현을 임의 진행.
