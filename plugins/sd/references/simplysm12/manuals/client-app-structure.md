# 앱 메뉴 구조와 권한 정의 매뉴얼

앱의 메뉴 트리, 화면 접근 권한, 화면 내 세부 권한을 한 군데(`appStructureItems`)에서 정의하는 방법.
새 화면을 메뉴에 올리거나, 화면에 권한을 걸거나, 화면 안에서 권한 보유 여부를 체크하는 작업 시 이 매뉴얼을 봄.
메뉴에 올라간 화면을 실제로 만드는 방법(목록, 편집 화면 구현)은 별도 주제임.

## 앱 구조를 한 파일에 정의함

메뉴, 권한은 `common` 패키지의 `appStructureItems: TSdAppStructureItem[]` 상수 하나에 모음.
클라이언트(admin, pda, vendor 등)마다 자기 배열만 정의하며, 서버에는 등록하지 않음.
클라이언트가 직접 import 함.

```ts
// client-common/src/commons/appStructureItems.ts
import { TSdAppStructureItem } from "@simplysm/sd-angular";

export const appStructureItems: TSdAppStructureItem[] = [
  { title: "메인화면", code: "main", isNotMenu: true },
  { title: "내 정보 수정", code: "my-info", isNotMenu: true },
  {
    title: "기초정보",
    code: "base",
    children: [
      { title: "사용자", code: "user", perms: ["use", "edit"] },
      { title: "거래처", code: "partner", perms: ["use", "edit"] },
    ],
  },
];
```

(출처: `simplysm-ts` client-common/commons/appStructureItems.ts, `centurymes` client-common/commons/appStructureItems.ts — 두 프로젝트 모두 이 형태임.)

이 배열은 클라이언트별 `SdAppStructureProvider` 구현 프로바이더에 연결함. `items` 에 배열을, `permRecord` 에 로그인 사용자의 권한 레코드를, `usableModules` 에 활성 모듈 목록을 각각 시그널로 물림.

```ts
// client-admin/src/providers/AppStructureProvider.ts
import { $computed, SdAppStructureProvider } from "@simplysm/sd-angular";
import { inject, Injectable } from "@angular/core";
import { appStructureItems } from "@simplysm-ts/client-common";
import { AppAuthProvider } from "./AppAuthProvider";

@Injectable({ providedIn: "root" })
export class AppStructureProvider extends SdAppStructureProvider {
  #appAuth = inject(AppAuthProvider);

  override items = appStructureItems;
  override usableModules = $computed(() => []);
  override permRecord = $computed(() => this.#appAuth.authInfo()?.user.permissionRecord);
}
```

(출처: `simplysm-ts`, `centurymes` 양쪽 client-admin/providers/AppStructureProvider.ts 가 동일함.)

- 이 프로바이더만 만들어 두면, 라이브러리의 `SdAppStructureProvider.usableMenus()`, `getPermissionsByStructure()`, `getPermsByFullCode()` 가 모두 이 `items`, `permRecord` 를 기준으로 동작함.
- 두 예시 프로젝트 모두 모듈 기능을 쓰지 않아 `usableModules` 가 빈 배열(`[]`)임. 모듈로 메뉴를 on/off 하지 않는 일반적인 앱이라면 이대로 둠.

## 메뉴에 그룹과 화면을 추가함

`appStructureItems` 배열에 항목을 추가하면 메뉴에 올라감. 항목은 두 종류임.

- **그룹**: `children` 을 가진 항목. 하위 항목을 묶기만 하며 권한, 라우팅 대상이 아님.
- **화면(leaf)**: `children` 없는 항목. 실제 라우팅, 권한 대상임.

```ts
{
  title: "기초정보",        // 그룹
  code: "base",
  children: [
    { title: "사용자", code: "user", perms: ["use", "edit"] },          // 화면
    { title: "사용자권한", code: "user-permission", perms: ["use", "edit"] },
    { title: "거래처", code: "partner", perms: ["use", "edit"] },
  ],
}
```

(출처: `simplysm-ts` appStructureItems.ts 의 `base` 그룹.)

- `code` 는 부모부터 dot 으로 이어져 화면을 식별함.
  위 예에서 사용자 화면의 fullCode 는 `base.user` 임.
  라우팅 경로(`/home/base/user`), 권한 키가 모두 이 코드 기준임.
  `code` 가 fullCode 로 이어지는 동작은 라이브러리 `SdAppStructureUtils.getMenus`(codeChain 을 누적해 `currCodeChain.join(".")` 으로 코드를 만듦) 에서 확인됨.
- 그룹에는 화면 전용 필드(`perms`, `subPerms`, `isNotMenu`)를 두지 않음.
  그룹은 표시 가능한 자식 화면이 하나도 없으면 메뉴에서 자동으로 빠짐(라이브러리 `getMenus` 가 `children.length > 0` 일 때만 그룹을 포함함).

**필드 정리**

| 필드        | 위치      | 용도                                         |
| ----------- | --------- | -------------------------------------------- |
| `title`     | 그룹, 화면 | 메뉴에 표시할 이름                           |
| `code`      | 그룹, 화면 | 항목 코드 (부모와 dot 으로 이어 화면 식별)   |
| `icon`      | 그룹, 화면 | 메뉴 아이콘 (`@ng-icons` 의 SVG 문자열 상수) |
| `children`  | 그룹      | 하위 항목 배열                               |
| `perms`     | 화면      | 부여할 권한 종류 (`"use"` / `"edit"`)        |
| `subPerms`  | 화면      | 화면 안의 세부 기능 권한                     |
| `isNotMenu` | 화면      | 메뉴에 노출하지 않음(라우팅 대상으로만 둠)   |

(타입 출처: 라이브러리 sd-angular .../core/providers/app/sd-app-structure.provider.ts 의 `ISdAppStructureGroupItem`, `ISdAppStructureLeafItem`, `ISdAppStructureSubPermission`.
`perms`, `subPerms`, `isNotMenu`, `icon` 은 leaf 전용, `children` 은 그룹 전용임.)

**새 화면 등록 관례**: 같은 그룹 안의 기존 화면 1개를 그대로 본떠 한 줄 추가함.
`title` 은 화면명 그대로, `code` 는 화면명을 dash-case 영문 슬러그로(프로젝트의 기존 슬러그 규칙을 따름).
화면 컴포넌트 파일은 PascalCase + 역할접미사(`XxxPage`, `XxxDetail` 등)로 만듦.

## 메뉴에 안 띄우고 화면만 둠

라우팅, 내부 진입용이라 사이드/탑 메뉴에는 노출하고 싶지 않은 화면은 `isNotMenu: true` 로 둠.

```ts
export const appStructureItems: TSdAppStructureItem[] = [
  { title: "메인화면", code: "main", isNotMenu: true }, // 홈
  { title: "내 정보 수정", code: "my-info", isNotMenu: true }, // 본인 정보
  // ... 이하 실제 메뉴 그룹
];
```

(출처: `simplysm-ts`, `centurymes` 양쪽 appStructureItems.ts 배열 맨 앞 두 항목.)

- 메뉴에서만 숨고 화면(라우팅 대상)은 그대로 존재함.
  라이브러리 `getMenus`, `getFlatMenus` 가 `"isNotMenu" in item && item.isNotMenu` 인 항목을 건너뛰어 메뉴에서 제외함.
- 홈(`main`), 내 정보 수정처럼 메뉴를 거치지 않고 직접 진입하는 화면은 배열 **맨 앞**에 그룹 없이 root-level 화면으로 모아두는 게 두 프로젝트 공통 관례임.
  권한도 걸지 않으므로 `perms` 를 두지 않음.

## 화면에 권한을 걸어 접근을 제한함

권한을 걸려면 화면 항목에 `perms` 를 정의함. 그러면 다음 셋이 함께 걸림.

- 권한 편집 화면에 체크 항목으로 나옴.
- 권한 없는 사용자에게 메뉴가 자동으로 숨겨짐.
- 화면 안에서 권한 보유 여부를 체크할 수 있음.

```ts
{
  title: "사용자",
  code: "user",
  perms: ["use", "edit"],
  subPerms: [
    { title: "인증정보", code: "auth", perms: ["use", "edit"] },
    { title: "개인정보", code: "personal", perms: ["use", "edit"] },
    { title: "급여정보", code: "payroll", perms: ["use", "edit"] },
  ],
}
```

(출처: `simplysm-ts` appStructureItems.ts 의 `base.user`.)

- `perms`: 부여할 권한 종류. `"use"`(조회) / `"edit"`(편집).
  `perms` 를 가진 화면만 권한 편집, 권한 체크 대상이 됨.
- `subPerms`: 한 화면 안의 세부 기능 권한.
  각 subPerm 도 `code`, `title`, `perms` 를 가지며, 권한 키는 `<화면fullCode>.<subPerm code>.<use|edit>` 로 이어짐(예: `base.user.auth.use`).
  라이브러리 `getPermissions` 가 subPerm 의 codeChain 을 `[...currCodeChain, subPerm.code]` 로 만드는 데서 확인됨.

**메뉴 자동 숨김 동작**: `perms` 가 있는 화면은 `permRecord` 에 `<fullCode>.use` 가 `true` 일 때만 메뉴에 나옴.
라이브러리 `getMenus` 가 leaf 에 대해 `if (item.perms != null && !permRecord?.[code + ".use"]) continue;` 로 거름.
그래서 `permRecord` 가 set 되기 전(로그인 전)에는 권한 화면이 메뉴에 나오지 않음.
반대로 `perms` 를 정의하지 않은 화면은 제약이 없어 항상 나옴.

## 화면 안에서 권한 시그널을 받아 표시, 편집에 적용함

화면 컴포넌트에서 `usePermsSignal(viewCodes, keys)` 로 권한 시그널을 만듦.
첫 인자는 권한 path(화면 fullCode 배열), 둘째 인자는 받고 싶은 권한 키 배열임.
반환 시그널은 보유한 키만 담긴 배열이라, `perms().includes("use")` 식으로 체크함.

```ts
import { usePermsSignal, AbsSdDataSheet, $computed } from "@simplysm/sd-angular";

export class UserPage extends AbsSdDataSheet<IFilter, IItem, number | undefined> {
  name = "사용자";
  perms = usePermsSignal(
    ["base.user"],
    ["use", "edit", "auth.use", "auth.edit", "personal.use", "personal.edit"],
  );

  override canUse = $computed(() => this.perms().includes("use"));
  override canEdit = $computed(() => this.perms().includes("edit") && !this.disabled());
}
```

(출처: `simplysm-ts` UserPage.ts. 실제로는 payroll 키까지 받음.)

- 둘째 인자의 키는 화면 자신의 `use`, `edit` 과, subPerm 의 `<subCode>.<use|edit>` 형식임.
  위 `"auth.use"` 는 `base.user` 화면의 `auth` subPerm 의 `use` 를 가리킴.
- `usePermsSignal` 은 내부적으로 `SdAppStructureProvider.getPermsByFullCode(viewCodes, keys)` 를 `$computed` 로 감쌈(라이브러리 sd-app-structure.provider.ts).
  그래서 `permRecord` 가 바뀌면 시그널이 자동으로 갱신됨.
- **권한 미정의 화면은 전부 허용**: 라이브러리 `getPermsByFullCode` 는, 해당 fullCode 항목에 `perms` 가 아예 없으면(`!("perms" in item)`) 요청한 키를 그대로 채워 돌려줌.
  즉 `perms` 를 안 건 화면에서 `usePermsSignal` 을 써도 `perms().includes("use")` 가 `true` 가 되어 막히지 않음.

**시그널을 화면 표시에 씀.** 권한 키 보유 여부로 컬럼/버튼을 조건부로 그림.

```html
@if (perms().includes("auth.use")) {
<sd-data-sheet-column [header]="['인증정보', '아이디']" key="loginId">
  <ng-template [cell]="items()" let-item let-edit="edit">
    <sd-textfield
      [disabled]="!canEdit() || !perms().includes('auth.edit')"
      [readonly]="!edit"
      [(value)]="item.loginId"
      (valueChange)="items.$mark()"
    />
  </ng-template>
</sd-data-sheet-column>
}
```

(출처: `simplysm-ts` UserPage.ts 템플릿. `auth.use` 가 없으면 인증정보 컬럼 자체가 안 그려지고, `auth.edit` 가 없으면 입력이 disabled 됨.)

**시그널을 조회, 저장 로직에도 적용함.** 표시뿐 아니라 쿼리 select/update 에서도 권한 키로 필드를 토글해, 권한 없는 사용자가 민감 필드를 읽거나 쓰지 못하게 함.

```ts
.select<IItem>((item) => ({
  id: item.id.notNull(),
  name: item.name,
  ...(this.perms().includes("personal.use")
    ? { socialSecurityNumber: item.socialSecurityNumber }
    : {}),
  ...(this.perms().includes("auth.use") ? { loginId: item.loginId } : {}),
}));
```

(출처: `simplysm-ts` UserPage.ts 의 `search()`. `submit()`, `uploadExcel()` 도 `personal.edit`, `auth.edit` 등으로 동일하게 토글함.)

- `AbsSdDataSheet`/`AbsSdDataDetail` 를 쓰는 화면은 `canUse`/`canEdit` 를 권한 시그널로 오버라이드하면 화면 접근 제한, 툴 숨김이 일괄 처리됨.
  화면 본문 구현은 목록, 편집 화면 매뉴얼을 따름.

## 권한 편집 UI 를 구성함

권한을 사용자에게 부여하는 화면은 `<sd-permission-table>` 에 ① 구조에서 뽑은 권한 트리(`items`)와 ② 사용자의 권한 레코드(`value`)를 양방향으로 물림.

권한 트리는 `SdAppStructureProvider.getPermissionsByStructure(appStructureItems)` 로 만듦. 이 메서드는 그룹/화면/subPerm 을 계층 그대로 `ISdPermission[]` 로 변환함(라이브러리 `getPermissions`).

```ts
export class UserPermissionDetail extends AbsSdDataDetail<Record<string, any>> {
  #appStructure = inject(AppStructureProvider);

  perms = usePermsSignal(["base.user-permission"], ["use", "edit"]);

  permissions = $computed<ISdPermission[]>(() =>
    this.#appStructure.getPermissionsByStructure(appStructureItems),
  );

  override canEdit = $computed(() => this.perms().includes("edit"));
}
```

```html
<sd-permission-table [items]="permissions()" [(value)]="data" [disabled]="!canEdit()" />
```

(출처: `simplysm-ts` UserPermissionDetail.ts.)

- `value` 는 `Record<string, boolean>` 으로, 키가 `<권한fullCode>.<use|edit>` (예: `base.user.use`, `base.user.auth.edit`) 이고 값이 체크 여부임.
  라이브러리 `sd-permission-table.control.ts` 의 `getIsPermChecked`/`onPermCheckChange` 가 `item.codeChain.join(".") + "." + type` 키로 `value` 를 읽고 씀.
- 테이블은 상위 권한을 끄면 하위까지 함께 끄고, `use` 를 끄면 같은 항목의 `edit` 도 자동으로 끔(컨트롤의 `_changePermCheck`).
  권한 편집 권한이 없으면 `disabled` 로 잠금.

이렇게 편집한 `value`(권한 레코드)는 화면의 권한 저장소(여기서는 `userPermission` 테이블)에 저장함.

```ts
override async submit() {
  await this.#appOrm.connectAsync(async (db) => {
    await db.userPermission
      .where((item) => [db.qh.equal(item.userId, this.userId())])
      .deleteAsync();

    for (const permKey of Object.keys(this.data())) {
      await db.userPermission.insertAsync([{
        userId: this.userId(),
        code: permKey,
        valueJson: JsonConvert.stringify(this.data()[permKey]),
      }]);
    }
  });

  // 해당 사용자 세션에 권한 변경을 알려 즉시 재로드시킴
  await this.#appService.client.emitAsync(
    AuthInfoEventListener,
    (info) => info.userId === this.userId(),
    undefined,
  );
  return true;
}
```

(출처: `simplysm-ts` UserPermissionDetail.ts. ORM 쿼리 상세는 [orm.md](./orm.md), 실시간 이벤트(`AuthInfoEventListener`)는 [event.md](./event.md) 참조.)

- 반대로 화면 진입 시에는 `userPermission` 행들을 `code → JsonConvert.parse(valueJson)` 로 풀어 `Record<string, boolean>` 으로 복원해 테이블의 `value` 에 넣음(같은 파일 `#getDataByUserId`).

## 권한 저장소를 메뉴, 권한 체크에 연결함

화면이 저장한 권한 레코드가 메뉴 필터, `usePermsSignal` 에 반영되려면, 로그인 사용자의 권한 레코드를 프로바이더의 `permRecord` 시그널로 물려야 함.
두 예시 프로젝트는 `permRecord` 를 인증 정보(`authInfo().user.permissionRecord`)에 연결함.

```ts
// AppStructureProvider
override permRecord = $computed(() => this.#appAuth.authInfo()?.user.permissionRecord);
```

(출처: `simplysm-ts`, `centurymes` AppStructureProvider.ts.)

이 `permissionRecord` 는 인증 시 서버 ORM 이 사용자의 권한 행들을 풀어 만든 `Record<string, boolean>` 임.
라이브러리 `DbContextExt.authAsync` 가 `dbUser.permissions.toObject((item) => item.code, (item) => JsonConvert.parse(item.valueJson))` 로 구성함(sd-orm-common-ext .../extensions/DbContextExt.ts).
즉 위 편집 화면이 `userPermission` 에 저장한 `code`, `valueJson` 이 다음 인증 때 그대로 `permissionRecord` 로 돌아옴.

- 로그인하면 `AppAuthProvider.authAsync`/`reloadAuthAsync` 가 `authInfo` 시그널을 set 하고, `permRecord` 가 그 값을 따라가며, `usableMenus()`, `usePermsSignal` 이 자동으로 갱신됨(`$computed` 체인).
  권한을 바꾼 뒤 위 `submit()` 이 `AuthInfoEventListener` 를 emit 하면 대상 사용자 세션이 `reloadAuthAsync` 로 권한을 다시 받아 즉시 반영됨.
- `permRecord` 가 아직 없을 때(로그인 전)는 `getMenus` 가 모든 권한 화면을 숨기고, `usePermsSignal` 은 빈 권한을 돌려줌.

## 정의한 메뉴를 화면에 띄움

필터까지 적용된 최종 메뉴 트리는 `SdAppStructureProvider.usableMenus()` 로 읽어 메뉴 컨트롤에 바인딩함.
`usableMenus()` 는 권한(`permRecord`), 모듈(`usableModules`) 필터를 이미 적용한 트리를 반환하므로, 컴포넌트에서 추가 필터를 두지 않음.

```ts
export class HomePage {
  #appStructure = inject(AppStructureProvider);
  menus = $computed(() => this.#appStructure.usableMenus());
}
```

```html
<sd-topbar-menu class="flex-fill" [menus]="menus()" />
```

(출처: `simplysm-ts` HomePage.ts. 사이드 메뉴 레이아웃이면 `<sd-sidebar-menu [menus]="menus()" />` 를 씀 — 두 컨트롤 모두 `menus: ISdMenu[]` 입력을 받음.)

## 지킬 것

- 메뉴, 권한은 항상 `common` 의 `appStructureItems` 한 곳에서 정의하고, 클라이언트별 `AppStructureProvider(items/usableModules/permRecord)` 로만 연결함.
  라이브러리 유틸을 직접 부르지 말고 프로바이더의 `usableMenus()`, `getPermissionsByStructure()`, `usePermsSignal()` 을 씀.
- 화면 `code` 는 부모와 dot 으로 이어져 라우팅 경로, 권한 키가 되므로, 기존 형제 화면의 슬러그 규칙을 그대로 따름.
  한 그룹 안에서 `code` 가 겹치지 않게 함.
- 권한을 걸 화면에는 `perms` 를, 화면 내 세부 권한에는 `subPerms` 를 정의함.
  그룹에는 권한 필드를 두지 않음. 메뉴 비노출이 필요하면 `isNotMenu: true` 만 둠.
- 화면 안에서는 권한을 `usePermsSignal(path, keys)` 로 받아 `perms().includes(...)` 로 체크함.
  표시(컬럼, 버튼)뿐 아니라 조회 select, 저장 update 에서도 같은 키로 민감 필드를 토글함.
- 권한 변경을 저장한 뒤에는 대상 사용자 세션에 변경을 알려(`AuthInfoEventListener` emit) 권한이 즉시 재로드되게 함.
- 권한이 메뉴, 체크에 실제로 반영되려면 `permRecord` 가 set 돼 있어야 함.
  로그인 전에는 빈 권한이라 권한 화면이 메뉴에 안 나오는 것이 정상임.
