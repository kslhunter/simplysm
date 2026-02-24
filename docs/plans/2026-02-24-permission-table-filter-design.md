# PermissionTable: perms 없는 아이템 필터링

## 문제

`buildPerms`가 `perms`/`subPerms` 없는 leaf 아이템도 결과에 포함시켜, `PermissionTable`에 빈 행(제목만 있는 행)이 표시됨.

## 수정 대상

`packages/solid/src/helpers/createAppStructure.ts` — `buildPerms` 함수

## 변경 내용

1. **leaf 필터링**: `perms`와 `subPerms` 모두 없는 leaf를 skip (`perms: []` 빈 배열도 "없음"으로 처리)
2. **빈 그룹 필터링**: 재귀적으로 children이 빈 배열이면 그룹도 skip

## 설계 결정

- 수정 위치: `buildPerms`만 수정 (데이터 소스에서 제거)
- `PermissionTable` 내부 필터링 로직(`isItemVisible` 등)은 변경 불필요
- `usablePerms` 소비자는 `PermissionTable`뿐이므로 영향 범위 없음
