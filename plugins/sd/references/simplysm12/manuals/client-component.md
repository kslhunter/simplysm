# 클라이언트 화면 컴포넌트 작성 일반 규약

이 매뉴얼은 v12(`@simplysm/sd-angular`) 기반 프로젝트에서 **모든 화면 컴포넌트가 공통으로 따르는 규약**을 다룸. 목록/편집 시트의 골격(`AbsSdDataSheet` / `sd-data-sheet`, `AbsSdDataDetail` / `sd-data-detail`) 자체는 [client-data-sheet.md](./client-data-sheet.md) 로 위임하고, 여기서는 화면의 종류와 무관하게 적용되는 사항(파일·데코레이터·시그널·권한·토스트·모달·레이아웃·아이콘·DI)을 정리함.

---

## 새 화면 파일을 만들 때 — 이름·역할 접미사·위치·selector

화면 파일은 **PascalCase 클래스명 + 역할 접미사**로 짓고, 파일명을 클래스명과 동일하게 둠(`UserPage.ts` 안에 `class UserPage`). 역할 접미사로 화면의 책임을 표시함.

| 접미사                | 역할                                                              | 골격                                   |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| `XxxPage.ts`          | 목록 화면(라우팅 진입 단위). 검색·페이징·CRUD.                    | `AbsSdDataSheet` + `<sd-data-sheet>`   |
| `XxxDetail.ts`        | 단건 편집 화면(모달 또는 페이지로 사용).                          | `AbsSdDataDetail` + `<sd-data-detail>` |
| `XxxModal.ts`         | 단건 CRUD 가 아닌 모달 전용 화면(도구·검색·재발급 다이얼로그 등). | `implements ISdModal` + 자체 구성      |
| `XxxControl.ts`       | 여러 화면에서 재사용되는 부분 컨트롤.                             | 자체 구성                              |
| `XxxPrintTemplate.ts` | 인쇄 양식. `SdPrintProvider.printAsync` 대상.                     | `implements ISdPrint`                  |

실제 예: `simplysm-ts/client-admin` 의 `UserPage.ts`(목록·`AbsSdDataSheet`), `LoginPage.ts`(로그인 화면), `PasswordResetModal.ts`(`implements ISdModal<void>`), `centurymes/client-admin` 의 `GoodsPage.ts`(목록) + `GoodsDetail.ts`(단건 편집·`AbsSdDataDetail`).

**위치**: 화면은 도메인 폴더에 클래스 파일을 모음. 예: `src/app/home/base/user/UserPage.ts`, `src/app/home/base/goods/GoodsPage.ts` + `GoodsDetail.ts`. 라우팅 폴더 경로는 dash-case(`base/goods`), 그 안의 파일·클래스는 PascalCase.

**`Modal` 과 `Detail` 의 구분**은 표시 방식이 아니라 **화면의 본질**로 정함. 한 레코드를 로드·저장하는 단건 화면이면 `AbsSdDataDetail` 을 상속한 `XxxDetail.ts` 로 만들고, 모달로 띄울 때도 그 `Detail` 을 그대로 `showAsync` 함(아래 "다른 화면을 모달로 띄우기"). `XxxModal.ts` 는 단건 CRUD 도 라우팅 페이지도 아닌, 모달로만 존재하는 비-CRUD UI(예: `PasswordResetModal` — 아이디·이메일로 임시 비밀번호 재발급)에만 씀.

**selector** 는 항상 `app-` prefix 를 붙인 dash-case 로 지음. 클래스명을 그대로 dash-case 화하지 않아도 되며 화면을 식별할 수 있는 짧은 이름이면 됨.

```ts
// UserPage.ts
@Component({ selector: "app-user" /* ... */ })
export class UserPage extends AbsSdDataSheet<IFilter, IItem, number | undefined> {}
```

```ts
// PasswordResetModal.ts
@Component({ selector: "app-password-reset" /* ... */ })
export class PasswordResetModal implements ISdModal<void> {}
```

---

## `@Component` 데코레이터 표준값을 설정함

v12 화면 컴포넌트의 `@Component` 데코레이터는 다음을 **항상** 그대로 둠(Angular 기본과 다른 부분만 명시).

```ts
@Component({
  selector: "app-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTextfieldControl,
    SdCheckboxControl,
    SdDataSheetControl,
    SdDataSheetColumnDirective,
    SdSheetColumnCellTemplateDirective,
  ],
  template: ` ... `,
})
```

- **`changeDetection: ChangeDetectionStrategy.OnPush`** — 항상. v12 는 zoneless 변경감지(`provideSdAngular` 가 `provideZonelessChangeDetection()` 등록)이므로 시그널 기반 OnPush 가 전제.
- **`encapsulation: ViewEncapsulation.None`** — 항상. 글로벌 SCSS 유틸 클래스(`flex-*`, `p-*`, `tx-*` 등)를 그대로 쓰기 위함.
- **`standalone: true`** — 항상. NgModule 을 새로 만들지 않음.
- **`imports`** — 템플릿에서 쓰는 컨트롤·디렉티브·파이프를 모두 명시함. 위 `UserPage` 처럼 `sd-data-sheet` 를 쓰면 `SdDataSheetControl` + `SdDataSheetColumnDirective` + 셀 템플릿 디렉티브 `SdSheetColumnCellTemplateDirective` 를 함께 import 함.
- **`template`** — 인라인(별도 `.html` 파일 분리 없음). `selector` 는 위 "selector" 규약대로 `app-` prefix.

---

## 라우팅에 lazy 로 등록함

화면(`Page`)은 `routes.ts` 에 `loadComponent` 로 lazy 등록함. 경로 세그먼트는 dash-case 이며, 도메인 트리를 `children` 으로 중첩함.

```ts
// routes.ts (simplysm-ts/client-admin)
export const routes: Routes = [
  {
    path: "login",
    loadComponent: () => import("./app/auth/LoginPage").then((m) => m.LoginPage),
  },
  {
    path: "home",
    loadComponent: () => import("./app/home/HomePage").then((m) => m.HomePage),
    children: [
      {
        path: "base",
        children: [
          {
            path: "user",
            loadComponent: () => import("./app/home/base/user/UserPage").then((m) => m.UserPage),
          },
        ],
      },
    ],
  },
];
```

- `import("...경로...").then((m) => m.XxxPage)` 형태로 클래스를 지연 로드함. 경로는 확장자 없이 파일 경로, `m.클래스명` 으로 해당 export 를 가리킴.
- 도메인 그룹(`base`, `accounting`, `system` 등)은 `children` 으로 묶고, 그룹 노드 자체에는 `loadComponent` 없이 하위만 둘 수 있음.
- `Detail` / `Modal` 은 라우팅에 등록하지 않음. 목록 화면 안에서 `showAsync` 로 직접 띄우거나 부모 화면에 임베드함.
- `provideSdAngular` 가 라우터 네비게이션 동안 전역 busy 오버레이를 자동 표시하므로(`NavigationStart` 에서 `globalBusyCount` 증가), lazy 로딩 중 별도 로딩 표시를 추가할 필요는 없음.

메뉴/권한 트리(`appStructureItems`)와의 대응은 [client-app-structure.md](./client-app-structure.md) 를 참조.

---

## 상태를 `$signal` / `$computed` 로 구성하고, 객체 내부 변경은 `$mark` 로 알림

화면 상태는 `@simplysm/sd-angular` 의 시그널 헬퍼로 만듦. `$signal` 으로 만든 시그널에는 `$mark()` 메서드가 부착되어 있어, 값 참조를 바꾸지 않고 강제로 변경 알림을 보낼 수 있음.

### 기본 상태 시그널

```ts
import { $signal, $computed, $effect } from "@simplysm/sd-angular";

// LoginPage 발췌
initBusyCount = $signal(0);
busyCount = $signal(0);
data = $signal<ILogin>({});
```

- `$signal(initialValue)` — 초기값을 주면 `SdWritableSignal<T>`. 초기값 없이 `$signal<T>()` 이면 `T | undefined`.
- `$computed(fn)` — 파생값. `$computed(() => this.sharedCustomers().filter((item) => item.isVendor))` 처럼 다른 시그널에서 계산.
- `$effect([deps], async fn)` — `deps` 배열에 나열한 시그널만 추적하고 본문은 `untracked` 로 실행함(본문 내부에서 시그널을 읽어도 재실행 트리거가 되지 않음). `[]` 를 주면 최초 1회만 실행 — 화면 진입 시 초기 로드에 씀.

### 객체·배열 시그널의 내부 필드 변경 알림 — `$mark()`

`$signal` 이 들고 있는 객체의 **필드만** 바꾸면 시그널 자체는 변경 알림을 보내지 않음(참조가 그대로이기 때문). 양방향 바인딩 입력의 변경 이벤트에 `$mark()` 를 묶어 호출함.

```html
<!-- LoginPage: data 객체의 loginId 필드를 양방향 바인딩하고 변경 시 $mark -->
<sd-textfield type="text" [(value)]="data().loginId" (valueChange)="data.$mark()" />
```

```html
<!-- UserPage 필터: filter 객체 내부 필드를 묶고 $mark -->
<sd-textfield type="text" [(value)]="filter().searchText" (valueChange)="filter.$mark()" />
<sd-checkbox [(value)]="filter().isIncludeLeft" (valueChange)="filter.$mark()">
  퇴사자 포함
</sd-checkbox>
```

```html
<!-- 시트 셀: items 배열 안 item 의 필드 편집 후 items.$mark() -->
<sd-textfield inset size="sm" [(value)]="item.name" (valueChange)="items.$mark()" />
```

- 객체 시그널(`filter`, `data`)은 `시그널.$mark()`, 배열 시그널(`items`)도 `items.$mark()` 로 알림.
- `[(value)]="filter().name"` 같이 시그널이 반환한 객체의 필드를 직접 양방향 바인딩하므로, 그 필드 변경을 외부에 알리려면 반드시 `(valueChange)="filter.$mark()"` 를 함께 둠. 빠뜨리면 입력은 반영되지만 그 값에 의존하는 `$computed` / `$effect` 가 재발화하지 않음.

`AbsSdDataSheet` / `AbsSdDataDetail` 를 상속한 화면은 `items` / `filter` / `data` 같은 표준 시그널을 기반 클래스가 제공하므로 직접 선언하지 않음(자세히는 [client-data-sheet.md](./client-data-sheet.md)). 위 `$mark()` 호출 규약은 동일하게 적용됨.

---

## 권한(`usePermsSignal`)으로 표시·편집을 가드함

화면 권한은 `usePermsSignal(<권한 path 목록>, <확인할 action 목록>)` 으로 받음. 반환 시그널을 `perms` 라는 이름으로 둠.

```ts
import { usePermsSignal } from "@simplysm/sd-angular";

// UserPage
perms = usePermsSignal(
  ["base.user"],
  [
    "use",
    "edit",
    "auth.use",
    "auth.edit",
    "personal.use",
    "personal.edit",
    "payroll.use",
    "payroll.edit",
  ],
);

// GoodsPage
perms = usePermsSignal(["base.goods"], ["use", "edit"]);
```

- 첫 인자: **권한 path 목록** — app-structure 의 화면 코드(점으로 결합된 도메인 트리 좌표).
- 둘째 인자: **확인할 action 목록**. `perms()` 의 반환값은 현재 사용자가 보유한 action 의 문자열 배열임.

**사용 패턴** — `perms().includes("...")` 를 인라인으로 씀.

```html
<!-- UserPage: 권한 보유 여부로 컬럼 전체를 표시/숨김 -->
@if (perms().includes("auth.use")) {
<sd-data-sheet-column [header]="['인증정보', '아이디']" key="loginId">...</sd-data-sheet-column>
}

<!-- 셀 단위 편집 가드: 편집 권한 없으면 disabled -->
<sd-textfield [disabled]="!canEdit() || !perms().includes('auth.edit')" [readonly]="!edit" ... />
```

권한 + 추가 조건이 **여러 곳에서 같은 결합으로 반복 참조**될 때만 `$computed` 로 묶음. `AbsSdDataSheet` 는 `canUse` / `canEdit` 를 오버라이드 멤버로 요구하므로 여기에 결합 결과를 둠.

```ts
// UserPage
disabled = input(undefined, { transform: transformBoolean });

override canUse = $computed(() => this.perms().includes("use"));
override canEdit = $computed(() => this.perms().includes("edit") && !this.disabled());
override hideTool = $computed(() => !!this.disabled());
```

`AbsSdDataSheet` 는 `canUse()` 가 false 면 접근 제한 화면을, `canEdit()` 이 false 면 편집/저장 도구를 비활성으로 처리함(상세 동작은 [client-data-sheet.md](./client-data-sheet.md)). `Abs*` 를 상속하지 않는 화면에서는 위 `@if (perms().includes("use"))` 처럼 직접 가드함.

---

## 비동기 작업을 `SdToastProvider.try` 로 감싸고, `busyCount` 로 busy 를 표시함

데이터 로드·저장 같은 비동기 작업은 `SdToastProvider.try(async () => { ... })` 로 감쌈. 콜백 안에서 throw 된 `Error` 는 danger 토스트로 표시되고 시스템 로그에 기록되며 외부로 전파되지 않음. 작업 전후로 `busyCount` 를 증감해 busy 상태를 표시함.

```ts
// LoginPage
#sdToast = inject(SdToastProvider);
busyCount = $signal(0);

async onSubmit() {
  this.busyCount.update((v) => v + 1);

  await this.#sdToast.try(async () => {
    await this.#appAuth.authAsync(this.data().loginId!, this.data().password!);
    this.#appLocalStorage.set("last-login-data", { loginId: this.data().loginId! });
    await this.#router.navigate([this.#appAuth.authInfo()?.user.configRecord.firstRouterLink ?? "/home/main"]);
  });

  this.busyCount.update((v) => v - 1);
}
```

**표준 형태**: `busyCount + 1` → `try(async () => { ... })` → `busyCount - 1`. `busyCount` 증감은 `try` 바깥에 두어, try 내부에서 에러가 나도 항상 `- 1` 이 실행되게 함.

**busy 표시는 컨테이너 컨트롤에 `busyCount() > 0` 를 바인딩**함.

```html
<!-- LoginPage: sd-busy-container -->
<sd-busy-container [busy]="busyCount() > 0">@if (busyCount() === 0) { ... }</sd-busy-container>

<!-- InvInboundPage(client-pda): sd-base-container 의 busy 입력 -->
<sd-base-container [busy]="busyCount() > 0" [initialized]="initialized()">
  <ng-template #contentTpl>...</ng-template>
</sd-base-container>
```

**최초 로드도 같은 패턴**으로, 생성자에서 `$effect([], async () => { ... })` 안에 둠. 첫 로드 완료 시 `initialized` 를 true 로 set 해 컨테이너의 초기 busy 오버레이를 해제함.

```ts
// InvInboundPage
initialized = $signal(false);
busyCount = $signal(0);

constructor() {
  $effect([], async () => {
    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#appOrm.connectAsync(async (db) => {
        this.count.set(/* ... 조회 ... */);
      });
    });
    this.busyCount.update((v) => v - 1);
    this.initialized.set(true);
  });
}
```

**메시지 직접 표시** — 성공/안내는 작업 성공 직후 직접 띄움.

```ts
this.#sdToast.success("저장되었습니다.");
this.#sdToast.danger("바코드 스캔이 잘못되었습니다."); // info/warning/danger 동일
```

`Abs*` 를 상속한 목록/편집 화면은 `busyCount` / `initialized` / busy 표시를 기반 클래스가 처리하므로, 화면 코드에서는 `search()` / `submit()` 같은 오버라이드 메서드 본문만 작성함(상세는 [client-data-sheet.md](./client-data-sheet.md)). 위 패턴은 `Abs*` 를 쓰지 않는 화면(로그인·PDA·리포트·모달 등)에서 직접 적용함.

---

## 다른 화면을 모달로 띄움 (`SdModalProvider.showAsync`)

다른 화면을 모달로 띄울 때는 `SdModalProvider.showAsync({ type, title, inputs })` 를 씀. 모달로 띄울 컴포넌트는 `ISdModal<O>` 를 구현해야 함(`initialized: Signal<boolean>` + `close: output<O | undefined>`).

```ts
// LoginPage → PasswordResetModal 을 모달로
#sdModal = inject(SdModalProvider);

async onPasswordResetButtonClick() {
  await this.#sdModal.showAsync(
    {
      type: PasswordResetModal,
      title: "비밀번호 재발급",
      inputs: { loginId: this.data().loginId },
    },
    { key: "login-password-reset-modal" },
  );
}
```

```ts
// GoodsPage → GoodsDetail 을 편집 모달로 (editMode = "modal" 인 목록의 editItem 오버라이드)
override async editItem(item?: IItem) {
  return await this.#sdModal.showAsync({
    type: GoodsDetail,
    title: item?.id != null ? `${this.name}수정(#${item.id})` : `${this.name}등록`,
    inputs: { itemId: item?.id, /* 그 외 GoodsDetail 의 input 들 */ },
  });
}
```

- **`type`** — `ISdModal` 을 구현한 컴포넌트 클래스. `GoodsDetail`(`AbsSdDataDetail` 상속, `ISdModal` 구현), `PasswordResetModal`(`implements ISdModal<void>`) 처럼 단건 편집 `Detail` 도 별도 `Modal` 없이 그대로 띄움.
- **`title`** — 모달 헤더 제목. 등록/수정에 따라 분기해도 됨.
- **`inputs`** — 모달 컴포넌트가 받을 `input()` 시그널 값. 없으면 `{}`.
- **반환값** — 모달 컴포넌트가 `close.emit(payload)` 한 값. 사용자가 배경 클릭·ESC·X 로 닫으면 `undefined`. 취소 가드는 `if (!result) return;`.
- 둘째 인자 `options` 의 `key` 는 모달 위치·크기를 저장할 식별자임(선택). 그 외 옵션(헤더 숨김·배경 클릭 닫기 등)은 [overlay.md](../apis/sd-angular/overlay.md) 참조.

모달로 띄워질 컴포넌트 쪽 구현(`close` output·`initialized`·`busyCount`)은 위 `PasswordResetModal` 코드를 따름.

---

## flex 유틸 클래스와 `sd-base-container` 로 레이아웃을 잡음

화면 영역 분할·배치는 글로벌 flex 유틸 클래스로 구성함(자체 `styles` 작성은 최후 수단).

**상하 분할**(본문 fill + 하단 고정 버튼 영역) — `PasswordResetModal` 의 모달 본문:

```html
<div class="flex-column fill">
  <div class="flex-fill p-default">
    <table class="form-table">...</table>
  </div>
  <div class="p-sm-default">
    <sd-button type="submit" theme="primary">...</sd-button>
  </div>
</div>
```

**컨테이너 + 카드 스택** — `InvInboundPage`:

```html
<div class="flex-column gap-sm p-0-default">
  <sd-card class="p-sm-default">...</sd-card>
  <sd-card class="p-default">...</sd-card>
</div>
```

자주 쓰는 유틸:

- **Flex**: `flex-row` / `flex-column`(컨테이너), `flex-fill`(남은 공간 차지), `flex-min`(콘텐츠 크기), `gap-sm` / `gap-default`.
- **부모 가득 채움**: `fill`.
- **패딩**: `p-{세로}-{가로}`(예: `p-default`, `p-xs-sm`, `p-sm-default`, `p-0-default`), 단일 방향 `pt-` / `pb-` / `pl-` / `pr-`.
- **텍스트 정렬·색**: `tx-left` / `tx-center` / `tx-right`, `tx-theme-gray-default`.

**`sd-base-container`** 는 `Abs*` 를 쓰지 않는 화면(특히 PDA·리포트 화면)의 공통 골격임. busy·초기화 오버레이·제목 영역을 제공하고, 본문은 `#contentTpl` 슬롯에 둠.

```html
<!-- InvInboundPage -->
<sd-base-container [busy]="busyCount() > 0" [initialized]="initialized()">
  <ng-template #contentTpl>
    <!-- 본문 -->
  </ng-template>
</sd-base-container>
```

- `[busy]="busyCount() > 0"` — busy 시그널을 boolean 으로 바인딩. `[initialized]="initialized()"` — false 면 초기 busy 오버레이.
- 본문은 반드시 `<ng-template #contentTpl>` 안에 둠(이 슬롯이 필수).
- `AbsSdDataSheet`/`AbsSdDataDetail` 를 상속한 목록/편집 화면은 `<sd-data-sheet>`/`<sd-data-detail>` 이 내부에서 `sd-base-container` 역할을 겸하므로 직접 감싸지 않음.

폼 항목 정렬에는 `form-table`(`<table>` 기반, `<th>` 라벨 + `<td>` 입력)과 검색 폼의 `<div><label>...</label><입력></div>` 나열(`#filterTpl` 안)을 씀. 폼 컨트롤 상세는 [client-form.md](./client-component.md) 참조.

---

## 아이콘을 사용함

v12 화면은 **`@fortawesome` 아이콘 + `FaIconComponent`** 를 씀. 사용할 아이콘을 단일 import 경로에서 가져와 컴포넌트 클래스에 `protected readonly` 멤버로 노출한 뒤, 템플릿에서 `<fa-icon [icon]=...>` 로 바인딩함.

```ts
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faLockOpen } from "@fortawesome/pro-regular-svg-icons/faLockOpen";

@Component({
  imports: [FaIconComponent /* ... */],
  template: `
    <sd-button type="submit" theme="primary" size="lg">
      <fa-icon [icon]="faLockOpen" [fixedWidth]="true" />
      로그인
    </sd-button>
  `,
})
export class LoginPage {
  protected readonly faLockOpen = faLockOpen;
}
```

```html
<!-- GoodsPage: 시트 셀 안 체크 아이콘 -->
<fa-icon [icon]="faCheck" [fixedWidth]="true" />
```

```html
<!-- InvInboundPage: 안내 영역 큰 아이콘 -->
<fa-icon [icon]="faBarcode" size="8x" />
```

**아이콘 패키지는 프로젝트마다 다르므로 대상 코드의 실제 import 를 확인해 따름.**

- `simplysm-ts` 는 `@fortawesome/pro-regular-svg-icons/<아이콘명>` (예: `faLockOpen`, `faPaperPlane`, `faQuestion`).
- `centurymes` 는 `@fortawesome/free-solid-svg-icons/<아이콘명>` (예: `faCheck`, `faBarcode`, `faDolly`, `faWarehouse`).

약속:

- 아이콘은 `import { faXxx } from "@fortawesome/.../faXxx"` 처럼 **개별 경로로 import** 함(트리셰이킹).
- 클래스에 `protected readonly faXxx = faXxx;` 로 노출하고 템플릿에서 `[icon]="faXxx"` 로 바인딩함.
- `imports` 에 `FaIconComponent` 를 반드시 추가함.

---

## inject 멤버를 `#private` 로 명명함

`inject()` 한 의존성은 외부에 노출되는 멤버(시그널·input·output·공개 메서드)와 구분하기 위해 **hard private(`#`) 필드**로 둠.

```ts
// UserPage / GoodsPage / LoginPage 공통
#appOrm = inject(AppOrmProvider);
#appService = inject(AppServiceProvider);
#appSharedData = inject(AppSharedDataProvider);
#appAuth = inject(AppAuthProvider);
#sdToast = inject(SdToastProvider);
#sdModal = inject(SdModalProvider);
#router = inject(Router);
```

- DI 멤버는 `#이름 = inject(Provider)` 형태(`private readonly` 키워드 대신 `#` hard private 사용).
- 시그널(`perms`, `data`, `busyCount`, `initialized`), `input()`, `output()`, 공개 메서드(`onSubmit` 등)는 prefix 없이 공개 멤버로 둠.
- 템플릿에서 참조해야 하는 멤버(아이콘 상수 등)는 `protected readonly` 로 둠 — `#` private 은 템플릿에서 접근할 수 없기 때문임(예: `protected readonly faCheck = faCheck;`).

---

## 관련 매뉴얼

- 목록/편집 시트 골격(`AbsSdDataSheet`·`AbsSdDataDetail`, `search`/`submit`/`editItem`/`toggleDeleteItems`, 컬럼·셀·페이징): [client-data-sheet.md](./client-data-sheet.md)
- ORM 쿼리 작성(`connectAsync`·`where`·`select`·`upsertAsync`·`insertDataLogAsync` 등): [orm.md](./orm.md)
- 서비스 호출·커스텀 ServiceClient·실시간 이벤트: [client-service.md](./client-service.md)
- 공유데이터 등록·선택(`AppSharedDataProvider`·`useSharedSignal`·`sd-shared-data-select`): [client-shared-data.md](./client-shared-data.md)
- 폼·입력 컨트롤·탭: [client-form.md](./client-component.md)
- 인쇄(`ISdPrint`·`SdPrintProvider`): [client-print.md](./client-print.md)
- 메뉴·권한 트리(`appStructureItems`·`sd-permission-table`): [client-app-structure.md](./client-app-structure.md)
