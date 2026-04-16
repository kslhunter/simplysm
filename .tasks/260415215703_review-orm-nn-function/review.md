# 코드 리뷰: orm-common nn() 타입 유틸리티 함수

## 리뷰 대상

- **태스크:** `.tasks/260415204449_orm-common-nn-function/`
- **구현 파일:** `packages/orm-common/src/exec/queryable.ts:1881-1912`
- **테스트 파일:**
  - `packages/orm-common/tests/types/nullable-queryable-record.spec.ts:57-138`
  - `packages/orm-common/tests/types/nn.spec.ts`

## 검증 결과

- **타입체크:** 통과 (0 에러, 0 경고)
- **테스트:** 14/14 통과 (browser + node 양쪽)

## 종합 평가

구현은 전반적으로 견고하며 설계 의도에 정확히 부합한다. phantom type을 통한 원본 `TData` 보존, 배열/단일 overload 순서, identity function 런타임 구현 모두 올바르다. Critical/Medium 이슈는 발견되지 않았다.

---

## DESIGN-001 [Low] UnwrapQueryableRecord에서 phantom symbol 키 누출

- **위치:** `packages/orm-common/src/exec/queryable.ts:1883-1884`, `1919-1929`

`NullableQueryableRecord`에 추가된 phantom 필드 `readonly [__nnOriginalData]?: TData`는 `UnwrapQueryableRecord`의 `[K in keyof R]` 매핑에 포함된다. `select()` 콜백에서 nullable relation을 직접 반환하는 경우:

```typescript
// 예시: NullableQueryableRecord가 UnwrapQueryableRecord를 통과하는 시나리오
db.post()
  .joinSingle("user", ...)
  .select((item) => ({ user: item.user }))  // R["user"] = NullableQueryableRecord<UserData> | undefined
```

`UnwrapQueryableRecord`가 `NullableQueryableRecord<UserData>`를 재귀 처리할 때, phantom symbol 키도 매핑 대상에 포함된다. `TData`(= `UserData`)의 원시 필드(`id: bigint`, `name: string` 등)는 `ExprUnit<infer T>` 패턴에 매칭되지 않으므로 `never`로 해석되어, phantom 키의 결과 타입이 `{ id: never; name: never; ... } | undefined`가 된다.

**영향 범위:**
- `select()` 결과에 `NullableQueryableRecord`를 직접 포함시키는 드문 패턴에서만 발생
- symbol이 미노출(`declare const`, export 없음)이므로 외부 코드에서 접근 불가
- 런타임 동작에는 영향 없음 (phantom은 타입 레벨 전용)

**개선 방향:** `UnwrapQueryableRecord`에서 symbol 키를 제외하는 필터 추가. 예: `[K in keyof R as K extends symbol ? never : K]`를 사용하여 symbol 키를 매핑에서 배제.

---

## DESIGN-002 [Low] 배열 relation 테스트가 실제 NullableQueryableRecord 경로를 검증하지 않음

- **위치:** `packages/orm-common/tests/types/nullable-queryable-record.spec.ts:94-113`

배열 relation 테스트에서 `nn(item.posts)`를 호출하는데, `item`은 `QueryableRecord<UserData>`이고 `posts`는 `foreignKeyTarget`(1:N 비nullable)이므로 `QueryableRecord<PostData>[]` 타입이다. 이는 이미 `QueryableRecord`이지 `NullableQueryableRecord`가 아니다.

`nn()`의 핵심 용도인 `NullableQueryableRecord<TData>[] → QueryableRecord<TData>[]` 변환은 `nn.spec.ts:24-28`에서 별도로 검증되고 있으므로 기능적 누락은 아니지만, 통합 테스트(`nullable-queryable-record.spec.ts`) 내에서는 실제 `NullableQueryableRecord[]` 입력을 사용하는 시나리오가 없다.

**영향 범위:**
- `nn.spec.ts`에서 정확한 타입의 단위 테스트가 존재하므로 커버리지 자체는 충분
- 통합 테스트의 의도와 실제 검증 경로 간 괴리

**개선 방향:** `nullable-queryable-record.spec.ts`의 배열 테스트를 중첩 relation 경로로 변경. 예: `nn(item.nullableRelation).arrayRelation` 패턴을 사용하여 실제 `NullableQueryableRecord[]` 입력이 `nn()`을 통과하는 시나리오를 검증.
