# @simplysm/angular — buttons

## `<sd-button>`

`type: "button"|"submit" = "button"`, `theme`(`primary|secondary|info|success|warning|danger|gray|blue-gray|link|link-<theme>|link-rev`), `inline`, `inset`, `size: "sm"|"lg"`, `disabled`, `buttonStyle`, `buttonClass`. content projection.

```html
<sd-button [theme]="'primary'" (click)="save()">저장</sd-button>
```

## `<sd-anchor>`

링크형 클릭 요소. `disabled`, `theme`(`primary|secondary|...|blue-gray`, default `primary`). 비활성 시 tabindex 제거.

```html
<sd-anchor [theme]="'danger'" (click)="del()">삭제</sd-anchor>
```

## `<sd-additional-button>`

본문 영역 + 우측 부가 버튼 슬롯(`<sd-anchor>`, `<sd-button>` projection). `size: "sm"|"lg"`, `inset`.

```html
<sd-additional-button>
  본문 내용
  <sd-button (click)="...">+</sd-button>
</sd-additional-button>
```

## `<sd-modal-select-button>`

검색 모달을 띄워 값을 선택받는 입력 위젯. `setupInvalid` 로 required 검증 내장.

```html
<sd-modal-select-button
  [modal]="orderSelectModalInfo"        <!-- SdSelectModalInfo<SdSelectModal<TKey>> -->
  [(value)]="selectedKey"                <!-- single 모드: TKey | multi 모드: TKey[] -->
  [selectMode]="'single'"
  [modalOptions]="{ resizable: true }"
  [required]="true"
  [disabled]="false"
  [size]="'sm'"
  [inset]="false"
  [searchIcon]="customIcon">
  {{ displayLabel() }}
</sd-modal-select-button>
```

- `SdSelectModal<TKey>` = `SdModalContentDef<SelectModalOutputResult<TKey>>` + `selectMode: InputSignal<"single"|"multi"|undefined>` + `selectedKeys: InputSignal<TKey[]>`.
- `SdSelectModalInfo<T>` = `SdModalInfo<T, "selectMode"|"selectedKeys">`.
- value 가 있고 required 가 아니면 좌측에 erase 아이콘 노출 → 클릭 시 초기화(single 은 `undefined`, multi 는 `[]`).
- 검색 버튼 클릭 → `SdModalProvider.showAsync` 호출, 결과 `{ selectedKeys }` 를 `selectMode` 에 맞춰 `value` 에 반영.
