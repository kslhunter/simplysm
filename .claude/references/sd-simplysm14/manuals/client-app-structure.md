# 앱 구조(AppStructure) 매뉴얼

앱의 메뉴·권한·기능 모듈을 한 군데서 정의하는 방법. 메뉴 트리, 화면 접근 권한, 모듈별 on/off 가 모두 이 구조 하나에서 나옴. 새 화면을 메뉴에 올리거나 권한을 거는 작업 시 참조.

## 1. 앱 구조 정의 위치

common 패키지에 클라이언트별 `AppStructureItem[]` 상수를 두고, 앱 부트스트랩에서 `SdAppStructureProvider.initialize(items)` 로 연결함.

```ts
// common/src/app-structure-items.ts
import type { AppStructureItem } from "@simplysm/service-common";
import { tablerBox } from "@ng-icons/tabler-icons"; // 아이콘은 @ng-icons 의 SVG 문자열 상수

export const adminAppStructureItems: AppStructureItem[] = [
  /* ... */
];
```

```ts
// 앱 부트스트랩 (main.ts)
provideAppInitializer(() => {
  inject(SdAppStructureProvider).initialize(adminAppStructureItems);
});
```

- 한 서버가 여러 앱(admin·pda 등)을 서비스해도, **클라이언트마다 자기 배열만** 정의해 import.
- 서버에 등록하지 않음 — common 에서 클라이언트가 직접 import 함.

## 2. 메뉴 추가

배열에 항목을 추가하면 메뉴에 올라감. **그룹**(하위 메뉴를 묶음)과 **화면**(실제 라우팅 대상)으로 나뉨.

```ts
export const adminAppStructureItems: AppStructureItem[] = [
  {
    title: "재고관리", // 그룹: children 보유
    code: "inventory",
    icon: tablerBox,
    children: [
      { title: "품목별 재고", code: "goods-inventory", perms: ["use"] }, // 화면(leaf)
      { title: "재고 실사", code: "stock-take", perms: ["use", "edit"] },
    ],
  },
];
```

- `code` 는 부모부터 dot 으로 이어져 화면을 식별함 (위 예: `inventory.goods-inventory`). 라우팅 경로·권한 키가 모두 이 코드 기준.
- 그룹은 `children` 만 두고 `perms`·`url` 을 두지 않음. 표시 가능한 자식이 하나도 없으면 그룹도 메뉴에서 자동으로 빠짐.
- 외부 링크 화면은 `url` 지정.

| 필드       | 위치      | 용도                                       |
| ---------- | --------- | ------------------------------------------ |
| `title`    | 그룹·화면 | 메뉴에 표시할 이름                         |
| `code`     | 그룹·화면 | 항목 코드 (부모와 dot 으로 이어 화면 식별) |
| `icon`     | 그룹·화면 | 메뉴 아이콘                                |
| `children` | 그룹      | 하위 항목 배열                             |
| `url`      | 화면      | 외부 링크 등 이동 경로                     |

## 3. 메뉴에 안 띄우고 화면만 두기

라우팅·내부 이동용이라 사이드 메뉴에는 노출하고 싶지 않은 화면은 `isNotMenu: true`.

```ts
export const adminAppStructureItems: AppStructureItem[] = [
  { title: "메인메뉴", code: "main", isNotMenu: true }, // 홈/메인 화면
  { title: "내 정보 수정", code: "my-info", isNotMenu: true }, // 사용자 본인 정보 화면

  {
    title: "재고관리",
    code: "inventory",
    children: [
      /* ... */
    ],
  }, // 이하 실제 메뉴 그룹
];
```

- 메뉴에서만 숨고, 화면(라우팅 대상) 자체는 그대로 존재함.
- 홈(`main`)·내 정보 수정처럼 메뉴를 거치지 않고 직접 진입하는 화면은 배열 **맨 앞**에 root-level leaf(그룹·`children` 없이)로 모아두는 게 관례. 권한을 걸지 않으므로 `perms` 도 두지 않음.

## 4. 권한으로 접근 제한

권한을 걸려면 화면에 `perms` 를 정의함. 그러면 ① 권한 관리 페이지에 체크 항목으로 나오고 ② 권한 없는 사용자에게는 메뉴가 자동으로 숨겨지고 ③ 화면 안에서 권한 보유 여부를 체크할 수 있음.

```ts
{
  title: "입고지시",
  code: "inbound-instruction",
  perms: ["use", "edit"],
  subPerms: [
    { code: "document", title: "문서작업", perms: ["edit"] }, // 화면 내 세부 권한
  ],
},
```

- `perms`: 부여할 권한 종류. `"use"`(조회) / `"edit"`(편집). `perms` 를 지정한 화면만 권한 페이지·권한 체크 대상이 됨.
- `subPerms`: 한 화면 안의 세부 기능 권한.

**권한을 사용자에게 부여** — 권한 관리 화면은 `getPermissionsByStructure(items)` 결과를 `<sd-permission-table>` 에 넘김. 저장한 결과는 사용자별 권한 레코드로 서버에 저장됨.

```ts
permissions = computed(() =>
  this._sdAppStructure.getPermissionsByStructure(this._sdAppStructure.items()),
);
// template: <sd-permission-table [items]="permissions()" [(value)]="data" />
```

**로그인 시 권한 연결** — 인증 후 사용자의 권한 레코드를 `permRecord` 에 set 하면 메뉴 필터·권한 체크에 반영됨.

```ts
this._sdAppStructure.permRecord.set(this.authInfo()!.user.permissionRecord);
```

**화면 안에서 권한 체크** — 화면 컴포넌트에서 `injectPermsSignal(<path>, <actions>)` 로 정의된 권한을 읽어 체크함. 첫 인자(권한 path)는 이 구조의 화면 fullCode(들). 체크 작성 관례(단순 체크는 인라인, `computed` 사용 기준)는 [client-component.md](./client-component.md) 의 '권한' 참조.

- `perms` 를 정의하지 않은 화면은 제약이 없으므로 항상 모든 권한이 활성으로 나옴.

## 5. 기능 모듈로 메뉴 on/off

계약·라이선스 등으로 앱마다 켜고 끄는 기능 묶음이 있으면 `modules`/`requiredModules` 로 조건을 걸고, 앱에서 활성 모듈을 `usableModules` 에 set 함.

```ts
{ title: "스케쥴링", code: "scheduling", modules: ["scheduling"], children: [ /* ... */ ] },
{ title: "고급분석", code: "advanced", requiredModules: ["analytics", "pro"] },
```

```ts
// 앱 초기화 시 활성 모듈 지정
this._sdAppStructure.usableModules.set(["scheduling"]);
```

- `modules`: 나열한 모듈 중 **하나라도** 활성이면 표시(OR).
- `requiredModules`: 나열한 모듈이 **모두** 활성이어야 표시(AND).
- 조건을 건 항목은 해당 모듈이 `usableModules` 에 없으면 메뉴·권한에서 빠짐. 조건이 없는 항목은 모듈 설정과 무관하게 표시됨.
- 모듈 기능을 쓰지 않는 앱은 `usableModules.set([])` 로 둠.
