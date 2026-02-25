# Typed Perms Accessor Design

## Background

`createAppStructure`의 `flatPerms`는 `"/home/base/user/use"` 같은 문자열 코드 기반이라 타입 안전성이 없음.
dot notation으로 `appStructure.perms.home.base.user.auth.use`처럼 접근하면서 TypeScript 자동완성과 SolidJS 반응성을 모두 지원하는 typed perms accessor 추가.

## Design Decisions

- **반환 타입**: `boolean` (reactive) — `permRecord` signal 기반 getter
- **위치**: `createAppStructure` 반환값의 `perms` 프로퍼티
- **타입 추론**: `const` type parameter (TS 5.0+)로 리터럴 타입 자동 추론
- **items 전달**: `createAppStructure`에 inline 전달 (별도 변수 + 타입 어노테이션 불가)
- **perms 없는 leaf**: perms 트리에서 제외

## Usage Example

```typescript
export const appStructure = createAppStructure({
  items: [
    {
      code: "home",
      title: "홈",
      children: [
        { code: "main", title: "메인", component: MainPage },
        {
          code: "base",
          title: "기준정보",
          children: [
            {
              code: "user",
              title: "사용자",
              component: UserPage,
              perms: ["use", "edit"],
              subPerms: [
                { code: "auth", title: "권한", perms: ["use"] },
              ],
            },
          ],
        },
      ],
    },
  ],
  permRecord: () => currentUserPermRecord(),
});

// Component usage
appStructure.perms.home.base.user.use       // boolean (reactive)
appStructure.perms.home.base.user.edit      // boolean (reactive)
appStructure.perms.home.base.user.auth.use  // boolean (reactive)

// Autocomplete chain:
// appStructure.perms. → home
// appStructure.perms.home. → base
// appStructure.perms.home.base. → user
// appStructure.perms.home.base.user. → use, edit, auth
```

## Type System

```typescript
// createAppStructure signature
function createAppStructure<
  TModule,
  const TItems extends readonly AppStructureItem<TModule>[],
>(opts: {
  items: TItems;
  usableModules?: Accessor<TModule[] | undefined>;
  permRecord?: Accessor<Record<string, boolean>>;
}): AppStructure<TModule, TItems>

// AppStructure — backward-compatible second type parameter
interface AppStructure<
  TModule,
  TItems extends readonly AppStructureItem<TModule>[] = readonly AppStructureItem<TModule>[],
> {
  // ...existing fields
  perms: InferPerms<TItems>;
}

// Recursive mapped type (internal)
// Group item → code as key, recurse into children
// Leaf item (with perms) → code as key, perm names as boolean keys
// Leaf item (no perms) → excluded
// SubPerm → subPerm code as key, nested perm names as boolean keys
```

## Runtime Implementation

Object built once at creation. Intermediate nodes (groups) are plain objects. Leaf perm values use `Object.defineProperty` getters reading `permRecord()`.

```typescript
function buildPermsObject(items, basePath, permRecord) {
  const obj = {};
  for (const item of items) {
    const path = basePath + "/" + item.code;

    if (isGroupItem(item)) {
      const child = buildPermsObject(item.children, path, permRecord);
      if (Object.keys(child).length > 0) obj[item.code] = child;

    } else if (item.perms || item.subPerms) {
      const leaf = {};
      for (const perm of item.perms ?? []) {
        Object.defineProperty(leaf, perm, {
          get() { return permRecord()?.[path + "/" + perm] ?? false; },
          enumerable: true,
        });
      }
      for (const sub of item.subPerms ?? []) {
        const subObj = {};
        for (const p of sub.perms) {
          Object.defineProperty(subObj, p, {
            get() { return permRecord()?.[path + "/" + sub.code + "/" + p] ?? false; },
            enumerable: true,
          });
        }
        leaf[sub.code] = subObj;
      }
      obj[item.code] = leaf;
    }
  }
  return obj;
}
```

- Getter reads `permRecord()` → SolidJS tracking scope auto-tracks
- Intermediate objects are plain — no unnecessary re-creation
- Lazy evaluation: perm value computed on access

## Changes

| File | Change |
|------|--------|
| `createAppStructure.ts` | `const` generic, `InferPerms` types, `buildPermsObject`, return `perms` |
| `AppStructure` interface | Add `TItems` type parameter with default (backward-compatible) |

### Backward Compatibility

- `AppStructure<SomeModule>` references work as-is (`TItems` defaults, perms untyped)
- `solid-demo/src/appStructure.ts` already passes items inline — autocomplete works automatically
- Existing `flatPerms`, `usablePerms`, etc. unchanged

### No Changes

- Existing tests and demos require no modification
- No breaking changes to public API
