# Angular Guidelines (v12 only)

> v13 has no Angular (replaced by SolidJS). Rules below are v12 only.

## Core Rules

- **Signal-based**: Do not use RxJS for state. Use `$signal`, `$computed`, `$effect`
- **Standalone only**: All components must have `standalone: true`
- **OnPush + None**: `ChangeDetectionStrategy.OnPush` and `ViewEncapsulation.None` are mandatory
- **input()/output()**: Do not use `@Input()`, `@Output()` decorators → use `input()`, `output()`, `model()` instead
- **Control flow**: Use `@if`, `@for`, `@switch` (no `*ngIf`, `*ngFor`)
- **DI**: Use `inject()` (no constructor parameter injection)
- **Icons**: Use `@ng-icons/tabler-icons` (not FontAwesome)
- **Package imports**: Import `@simplysm/sd-angular` only from root (no subfolders)

## Signal Utilities

- `$signal<T>(value?)` — writable signal (can mark dirty with `$mark()`)
- `$computed(fn)` — synchronous computed. Async: `$computed([deps], asyncFn, { initialValue })`
- `$effect(fn)` — dependency tracking: `$effect([() => dep1()], () => { ... })`
- `$arr(signal)` — array operations (`.insert()`, `.remove()`, `.toggle()`, `.diffs()`)
- `$obj(signal)` — object operations (`.updateField()`, `.snapshot()`, `.changed()`)
- `$set(signal)` — Set operations (`.add()`, `.toggle()`)

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

Implement `ISdModal<T>` interface:

```typescript
export class MyModal implements ISdModal<TResult> {
  param = input<string>();
  close = output<TResult>();
}

// Usage
await this.#sdModal.showAsync({
  type: MyModal,
  title: "Title",
  inputs: { param: "value" },
});
```

## Data Sheet

CRUD tables extend `AbsSdDataSheet<TFilter, TItem, TKey>`:

- `search()` — query data
- `submit()` — save changes
- `downloadExcel()` / `uploadExcel()` — Excel integration
- `$mark()` — mark dirty when cell is modified (mandatory)

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

- Use CSS variables: `--theme-primary-default`, `--gap-sm`, `--border-radius-default`, etc.
- Do not hardcode colors
- Themes: `"compact"` | `"mobile"` | `"kiosk"` + dark mode

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
