# @simplysm/angular — buttons

## `<sd-button>`

`type: "button"|"submit" = "button"`, `theme`(`primary|secondary|info|success|warning|danger|gray|blue-gray|link|link-<theme>|link-rev`), `inline`, `inset`, `size: "sm"|"lg"`, `disabled`, `buttonStyle`, `buttonClass`. content projection.

```html
<sd-button [theme]="'primary'" (click)="save()">저장</sd-button>
```

## `<sd-anchor>`

링크형 클릭 요소. `disabled`, `theme`(`primary|secondary|...|blue-gray`, default `primary`). tabindex 자동.

```html
<sd-anchor [theme]="'danger'" (click)="del()">삭제</sd-anchor>
```

## `<sd-additional-button>`

본문 + 우측 부가 버튼 슬롯. `size`.

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
  [searchIcon]="customIcon">
  {{ displayLabel() }}
</sd-modal-select-button>
```

- `SdSelectModal<TKey>` = `SdModalContentDef<SelectModalOutputResult<TKey>>` + `selectMode: InputSignal<"single"|"multi"|undefined>` + `selectedKeys: InputSignal<TKey[]>`.
- `SdSelectModalInfo<T>` = `SdModalInfo<T, "selectMode"|"selectedKeys">`.
- erase 아이콘 클릭 시 `value` 초기화(`undefined` 또는 `[]`).
