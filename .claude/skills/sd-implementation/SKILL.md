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

1. **구현** — design.md 추종. 추종 불가 시 즉시 중단·사용자 보고, 임의 변경·우회 금지. 중단 시 `implemented: pending` 유지.
2. **패키지 레벨 검증** — typecheck / lint / test 전체.
3. **정방향 검토** — story-map.md → task.md → design.md → impl.md → code 일관성 / 변질 / 누락 점검. 발견 시 보고 + 해결 제안.
4. **안내** — 시연 필요 시 시나리오 안내, 아니면 완료 보고. 워크플로 완주 시 `implemented` 를 YYYY-MM-DD 로 갱신.

## 운용

- **커밋 안 함** (사용자 정책 — 병렬 작업 충돌 방지).

## 안티패턴

- 미해결 잔존 상태에서 완결 처리.
- design.md 와 어긋나는 구현을 임의 진행.
