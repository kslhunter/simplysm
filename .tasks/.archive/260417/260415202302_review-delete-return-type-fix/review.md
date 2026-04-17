# 코드 리뷰: orm-common delete/update 반환 타입 수정

## CONSIST-001 [Low] sd-claude 문서에 수정 전 타입 시그니처가 잔존

- **위치:** packages/sd-claude/claude/references/sd-simplysm14/orm-common/docs/queryable-executable.md:62,66

`update`/`delete` 메서드의 소스 코드에서 `$columns` → `$inferColumns`로 수정되었으나, Claude 참조 문서에는 아직 구 시그니처(`$columns`)가 그대로 남아있다. 이 문서는 Claude Code가 코드 작성 시 참조하는 가이드이므로, 잘못된 타입 정보를 제공하여 향후 코드 생성 시 동일 버그를 재생산할 수 있다.

**개선 방향:** 문서의 `update`/`delete` 시그니처에서 `$columns` → `$inferColumns`로 일괄 수정

---

## 검증 결과

- **타입체크:** orm-common 통과 (0 에러, 0 경고)
- **테스트:** 90개 파일, 1782개 테스트 전부 통과
- **CUD 메서드 일관성:** `insert`, `insertIfNotExists`, `upsert`, `update`, `delete` 모두 `$inferColumns` 사용 확인
- **변경 범위:** 타입 시그니처만 수정, 런타임 로직 변경 없음 — WBS 경계 준수
