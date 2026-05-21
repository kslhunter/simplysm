# @simplysm/angular — buttons

## SdButton — `<sd-button>`

```ts
type = input<"button" | "submit">("button");
theme = input<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"|"link"|"link-primary"|"link-secondary"|"link-info"|"link-success"|"link-warning"|"link-danger"|"link-gray"|"link-blue-gray"|"link-rev">();
inline = input(false); inset = input(false); size = input<"sm"|"lg">();
disabled = input(false); buttonStyle = input<string>(); buttonClass = input<string>();
```

- `type` — 내부 `<button type>`. `submit` 이면 둘러싼 `<sd-form>`·`<form>` 의 서밋을 트리거.
- `theme` — 색상·강조. `link-*` 는 배경 없는 텍스트 링크 룩. 미지정이면 디폴트 회색.
- `inline` — true 면 인라인 블록 폭(콘텐츠 크기). false 면 부모 폭 채움.
- `inset` — true 면 외곽 보더/그림자 제거(컨테이너 안에 박힌 룩).
- `size` — `sm`/`lg` 만. 미지정 = 기본 크기.
- `disabled` — true 면 클릭·포커스 차단.
- `buttonStyle`/`buttonClass` — 내부 `<button>` 에 style/class 추가.

```html
<sd-button theme="primary" (click)="onSave()">저장</sd-button>
```

## SdAnchor — `<sd-anchor>`

```ts
disabled = input(false);
theme = input<"primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"|...>();
```

- 링크 룩 클릭 영역. 버튼보다 강조 낮음. `theme` 미지정이면 현재 텍스트 색 상속.
- `disabled` — 클릭·포커스 차단.

```html
<sd-anchor (click)="onEdit()">수정</sd-anchor>
```

## SdAdditionalButton — `<sd-additional-button>`

```ts
size = input<"sm"|"lg">(); inset = input(false);
```

- 입력 컨트롤(`<sd-textfield>` 등) 옆에 붙이는 보조 버튼 슬롯. `<ng-content>` 로 아이콘/텍스트 투영. 키패드 등 입력 우측에 액션 붙일 때.

```html
<sd-textfield type="text" [(value)]="q" /><sd-additional-button (click)="onSearch()">검색</sd-additional-button>
```

## SdModalSelectButton — `<sd-modal-select-button>`

```ts
class SdModalSelectButton<M extends "single"|"multi", K, T extends SdSelectModal<K>>
modal = input.required<SdSelectModalInfo<SdSelectModal<K>>>();
value = model<SelectModeValue<K>[M]>();
disabled = input(false); required = input(false); inset = input(false);
size = input<"sm"|"lg">(); selectMode = input<M>("single" as M);
modalOptions = input<SdModalOptions>();
searchIcon = input(tablerSearch);

interface SdSelectModal<TKey> extends SdModalContentDef<SelectModalOutputResult<TKey>> {
  selectMode: InputSignal<"single"|"multi"|undefined>;
  selectedKeys: InputSignal<TKey[]>;
}
type SdSelectModalInfo<T extends SdSelectModal<any>> = SdModalInfo<T, "selectMode"|"selectedKeys">;
```

- 입력 옆에 검색 버튼이 붙은 모달 트리거 컨트롤. 검색 아이콘 클릭 → 지정 모달 표시 → 모달이 `SelectModalOutputResult<TKey>` emit → `value` 에 반영.
- `modal` — 표시할 모달 컴포넌트 정의(`SdSelectModal` 구현). 필수.
- `value` — `single` 모드면 단일 키, `multi` 면 키 배열. `model` 이므로 양방향.
- `selectMode` — 모달에 전달되는 선택 모드. `single` 기본.
- `required` — true 면 값이 있어도 지우개 아이콘 표시 안 함. false + 값 있음 → 우측에 지우개 아이콘 노출.
- `inset` — 컨테이너 안에 박힌 룩(보더 제거).
- `disabled` — 검색·지우개 버튼 모두 숨김.
- `modalOptions` — `SdModalProvider.showAsync` 에 전달되는 옵션 ([modal.md](./modal.md)).
- `searchIcon` — 우측 버튼 아이콘. 기본 `tablerSearch`.
- `<ng-content>` — 좌측 값 표시 영역.

```html
<sd-modal-select-button [(value)]="userId" [modal]="{ title: '직원선택', type: EmpSelectModal, inputs: {} }">
  {{ userName() }}
</sd-modal-select-button>
```

## 공통 주의

- 모든 버튼류는 standalone. 별도 NgModule 등록 불필요.
- `theme` 의 같은 8개 baseline(`primary`~`blue-gray`)은 디자인 토큰 `--theme-<name>-default` 에 연결. `SdButton.theme` 만 `link-*` 변종 추가.
