# createAppStructure Provider 패턴 변경

## 문제

`createAppStructure`의 반환 타입 `AppStructure<TModule> & { perms: InferPerms<TItems> }`에서 `InferPerms<TItems>`는 items 리터럴에서 추론되는 복잡한 타입.
Context에 넣을 때 이 타입을 수동으로 명시할 수 없어 `AppStructure<unknown>`으로 퇴화되고, `perms` 타입 정보가 소실됨.

## 변경 내용

### 변경 전

```typescript
// 반환: AppStructure<TModule> & { perms: InferPerms<TItems> }
const appStructure = createAppStructure({
  items: [...],
  permRecord: () => ...,
});

// Context에 넣으면 타입 소실
const Ctx = createContext<AppStructure<unknown>>();
```

### 변경 후

```typescript
const { AppStructureProvider, useAppStructure } = createAppStructure(() => ({
  items: [...],
  permRecord: () => auth.authInfo()?.permissions,
}));

// AppStructureProvider: ParentComponent
// useAppStructure(): AppStructure<TModule> & { perms: InferPerms<TItems> }  (완전한 타입)
```

### 시그니처

```typescript
export function createAppStructure<
  TModule,
  const TItems extends AppStructureItem<TModule>[],
>(
  getOpts: () => {
    items: TItems;
    permRecord?: Accessor<Record<string, boolean> | undefined>;
    usableModules?: Accessor<TModule[] | undefined>;
  },
): {
  AppStructureProvider: ParentComponent;
  useAppStructure: () => AppStructure<TModule> & { perms: InferPerms<TItems> };
};
```

- `getOpts` 콜백은 `AppStructureProvider` 렌더 시점에 호출 → `useAuth()` 등 context hook 사용 가능
- `const TItems`로 items 리터럴 타입 추론 → `InferPerms<TItems>` 보존
- 기존 `AppStructure` 인터페이스와 내부 로직은 그대로 유지

## 구현

- `createAppStructure.ts` 내부: 기존 로직을 `buildAppStructure` (비공개)로 분리, `createAppStructure`는 Provider/hook을 생성하여 반환
- `index.ts`: export 변경 없음 (함수명 동일, 타입 export 동일)

## 영향 범위

| 파일 | 영향 |
|------|------|
| `PermissionTable.tsx` | `AppPerm` 타입 import만 → 변경 없음 |
| `SidebarMenu.tsx` | `AppMenu` 타입 import만 → 변경 없음 |
| `createAppStructure.spec.tsx` | `createAppStructure()` 직접 호출 → 테스트 업데이트 필요 |
