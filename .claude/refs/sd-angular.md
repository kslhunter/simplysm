# Angular Guidelines (v12 only)

> v13에는 Angular 없음 (SolidJS로 대체됨). 아래 규칙은 v12 전용.

## Core Rules

- **Signal 기반**: 상태에 RxJS 사용 금지. `$signal`, `$computed`, `$effect` 사용
- **Standalone only**: 모든 컴포넌트 `standalone: true`
- **OnPush + None**: `ChangeDetectionStrategy.OnPush`, `ViewEncapsulation.None` 필수
- **input()/output()**: `@Input()`, `@Output()` 데코레이터 사용 금지 → `input()`, `output()`, `model()` 사용
- **Control flow**: `@if`, `@for`, `@switch` 사용 (`*ngIf`, `*ngFor` 금지)
- **DI**: `inject()` 사용 (생성자 파라미터 주입 금지)
- **아이콘**: `@ng-icons/tabler-icons` 사용 (FontAwesome 아님)
- **패키지 import**: `@simplysm/sd-angular` 루트에서만 import (서브폴더 접근 금지)

## Signal Utilities

- `$signal<T>(value?)` — writable signal (`$mark()`로 dirty 표시 가능)
- `$computed(fn)` — 동기 computed. 비동기: `$computed([deps], asyncFn, { initialValue })`
- `$effect(fn)` — 조건 추적 가능: `$effect([() => dep1()], () => { ... })`
- `$arr(signal)` — 배열 조작 (`.insert()`, `.remove()`, `.toggle()`, `.diffs()`)
- `$obj(signal)` — 객체 조작 (`.updateField()`, `.snapshot()`, `.changed()`)
- `$set(signal)` — Set 조작 (`.add()`, `.toggle()`)

## Component Pattern

```typescript
@Component({
  selector: "app-my-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTextfieldControl, SdButtonControl],
  template: `
    ...
  `,
})
export class MyPage {
  #sdToast = inject(SdToastProvider);
  #sdModal = inject(SdModalProvider);

  busyCount = $signal(0);
  data = $signal<IData>({});

  constructor() {
    $effect([], async () => {
      await this.#loadData();
    });
  }
}
```

## Bootstrap

```typescript
sdHmrBootstrapAsync(AppPage, {
  providers: [
    provideRouter([...routes], withHashLocation()),
    provideSdAngular({
      clientName: "my-app",
      defaultTheme: "compact",
    }),
  ],
});
```

## Modal

`ISdModal<T>` 인터페이스 구현:

```typescript
export class MyModal implements ISdModal<TResult> {
  param = input<string>();
  close = output<TResult>();
}

// 호출
await this.#sdModal.showAsync({
  type: MyModal,
  title: "제목",
  inputs: { param: "value" },
});
```

## Data Sheet

CRUD 테이블은 `AbsSdDataSheet<TFilter, TItem, TKey>` 확장:

- `search()` — 데이터 조회
- `submit()` — 변경사항 저장
- `downloadExcel()` / `uploadExcel()` — 엑셀 연동
- `$mark()` — 셀 수정 시 dirty 표시 필수

## Busy / Error Handling

```typescript
this.busyCount.update((v) => v + 1);
try {
  await this.#sdToast.try(async () => {
    /* work */
  });
} finally {
  this.busyCount.update((v) => v - 1);
}
```

## Theming

- CSS 변수 사용: `--theme-primary-default`, `--gap-sm`, `--border-radius-default` 등
- 하드코딩 색상 금지
- 테마: `"compact"` | `"mobile"` | `"kiosk"` + dark mode

## Permissions

```typescript
perms = usePermsSignal(["base.partner"], ["use", "edit"]);
canEdit = $computed(() => this.perms().includes("edit"));
```

## Routing

```typescript
{
  path: "my-page",
  loadComponent: () => import("./MyPage").then((m) => m.MyPage),
}
```
