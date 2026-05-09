# design.md 템플릿

`.story-maps/{yyMMddHHmmss}_{slug}/TASK-XXX-slug/design.md`

## 템플릿

```markdown
# TASK-001-입고지시서수정 Design

## 메타
- designed: <pending | YYYY-MM-DD>  ← Open Question 잔존 시 pending, 0 도달 시 YYYY-MM-DD

## Current State
- Story 1: <코드베이스 현 상태 자연 서술 — 위치 / 부분 구현 여부 / 차이점 등>
- Story 2: ...

## Solution
- Story 1: <변경 접근 자연 서술>
- Story 2: ...

## Detailed Design (있을 때만)
<UI wireframe / API 스펙 / Data Model / 외부 연동 등. 단순 변경(색상/문구/상수)은 생략>

## Testing
- Story 1: <테스트 접근 자연 서술>
- Story 2: ...

## Rollout
<Story 간 순서, 의존성, 병렬 가능 여부>

## Open Questions (있을 때만)
- [ ] Q1: <확인 필요 사항>
```

## Detailed Design 가이드

| 성격 | 설계 내용 |
|---|---|
| **UI** | wireframe (텍스트 ASCII) + 이벤트 흐름 + 상태 변화 |
| **API** | 엔드포인트 / 요청·응답 스키마 / 에러 케이스 / 인증·권한 |
| **Data Model** | 스키마 변경 / 마이그레이션 / 기존 데이터 처리 |
| **외부 연동** | 호출 시퀀스 / 실패·재시도·타임아웃 / 멱등성 |

매핑된 demo.md(scaffold)가 있는 UI Story: scaffold 가 정본. design.md 는 "demo.md 참조" 만 적고 wireframe·이벤트 흐름 생략. 추가 결정만 기록.
