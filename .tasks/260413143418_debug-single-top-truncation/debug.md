# 디버그: single() + 1:N include 시 top(2)로 인한 관계 데이터 잘림

## 출처

- **origin:** `simplysm#23`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: `result.children`에 50건 모두 포함 / 실제: `result.children`에 2건만 포함
- **위치:** `packages/orm-common/src/exec/queryable.ts:1044` — `single()` 메서드
- **재현 절차:** Parent 1건 + Child 50건 INSERT → `include(item => item.children).single()` 호출

## 근본 원인

`single()` 메서드(`queryable.ts:1044`)가 `this.top(2).execute()`를 호출하여 SQL 레벨에서 raw 행 수를 2개로 제한한다. 1:N JOIN이 있으면 하나의 논리적 parent 행이 N개의 물리적 행으로 전개되는데, `TOP 2`/`LIMIT 2`는 이 물리적 행에 적용되어 `parseQueryResult` 그룹핑 이전에 데이터가 잘린다.

ACH 분석으로 `parseQueryResult` 그룹핑 버그 가설은 폐기됨 (반환 건수가 정확히 top(2)와 일치하므로 불일치).

## 해결 방안

- **방안:** `single()`에서 `top(2)` 완전 제거
- **설명:** `single()` 메서드에서 `top(2)` 호출을 제거하고, 전체 결과를 조회한 뒤 그룹핑 후 결과 건수를 검증한다. join 유무와 관계없이 일관된 동작을 보장한다.
- **선택 사유:** 사용자 판단 — "top(2)가 없어야 하는게 맞음". `single()`은 정확한 WHERE 조건과 함께 사용하는 것이 일반적이므로 성능 영향 미미.

변경 전:
```typescript
async single(): Promise<TData | undefined> {
  const result = await this.top(2).execute();
  if (result.length > 1) {
    throw new ArgumentError("단일 결과를 기대했으나 복수 결과가 반환되었습니다.", {
      table: this._getSourceName(),
      resultCount: result.length,
    });
  }
  return result[0];
}
```

변경 후:
```typescript
async single(): Promise<TData | undefined> {
  const result = await this.execute();
  if (result.length > 1) {
    throw new ArgumentError("단일 결과를 기대했으나 복수 결과가 반환되었습니다.", {
      table: this._getSourceName(),
      resultCount: result.length,
    });
  }
  return result[0];
}
```
