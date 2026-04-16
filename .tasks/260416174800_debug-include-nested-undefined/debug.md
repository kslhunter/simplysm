# 디버그: 다단계 include 후 select()에서 중첩 관계 접근 시 undefined

## 출처

- **origin:** `kslhunter/simplysm#26`
- **완료 시 참고:** GitHub 이슈인 경우, 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 문제 증상

- **유형:** 에러
- **증상:** `TypeError: Cannot read properties of undefined (reading 'name')` — `include()`로 1:N(FKT) 하위의 N:1(FK) 관계를 포함한 후, `select()` 콜백에서 `.map()`을 통해 `child.detail!.name` 접근 시 `child.detail`이 `undefined`
- **위치:** `packages/orm-common/src/exec/queryable.ts:811` — `joinSingle(chainParts.join("."), ...)` 및 `:722` — `[as]: joinColumns` (flat dotted key 저장)
- **재현 절차:** `.include((item) => item.children.detail).select((item) => ({ children: item.children!.map((child) => ({ detailName: child.detail!.name })) }))`

## 근본 원인

`_include()` 메서드가 다단계 관계를 flat dotted key(`"children.detail"`)로 columns 객체에 저장하지만, `select()` 콜백에서는 nested object access(`children[0].detail`)를 기대하여 구조 불일치 발생.

- `join()` (라인 666): `[as]: [joinColumns]` → `children: [{ id, parentId, detailId }]`
- `joinSingle()` (라인 722): `[as]: joinColumns` → `"children.detail": { id, name }` (flat key)
- `select()` (라인 262): `this.meta.columns`를 직접 전달 → `child.detail`은 `children[0]` 객체에 없으므로 `undefined`

이 문제는 FKT→FK 뿐 아니라 모든 2단계 이상 include 후 select/where 중첩 접근에 영향.

## 해결 방안

- **방안:** C안 — `_include()` 내부 근본 수정
- **설명:** `_include()` 내부에서 join/joinSingle 호출 후 flat dotted key를 즉시 부모 관계 내부로 이동(nesting)하고 flat key를 제거. `parentCols[parentChain]` 접근 방식을 nested path traversal로 변경. downstream 전체 체인(`_buildSelectDef`, `getResultMeta`, `transformColumnsAlias`, `result-parser`)이 이미 재귀적으로 nested 구조를 처리하므로 안전.
- **선택 사유:** flat key + nested 공존의 데이터 중복 없이, columns 구조를 TypeScript 타입과 일치시키는 근본적 해결
