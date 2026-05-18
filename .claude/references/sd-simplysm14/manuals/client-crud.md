# sd-crud-list / sd-crud-detail 매뉴얼

화면 작성 시 표준 목록 컴포넌트(`sd-crud-list`) 또는 표준 단건 편집 컴포넌트(`sd-crud-detail`) 를 채택하기로 결정했을 때의 사용법. 컴포넌트 일반 규약·데이터 흐름은 [client-component.md](./client-component.md).

## `sd-crud-list`

목록 화면의 표준 골격. 시트 + 검색 폼 + 등록/삭제/복구 버튼 + CTRL+S 저장 + 모달 선택 모드를 한꺼번에 처리.

### 표준 호출

```html
<sd-crud-list
  [(ready)]="ready"
  [initialized]="initialized()"
  [(busyCount)]="busyCount"
  [restricted]="!perms().includes('use')"
  [readonly]="!canEdit()"
  [viewType]="viewType()"
  [selectMode]="selectMode() ?? 'multi'"
  [key]="'<도메인-키>'"
  [items]="items()"
  [trackByFn]="trackByFn"
  [(selectedKeys)]="selectedKeys"
  [(currentPage)]="page"
  [totalPageCount]="pageLength()"
  [(sorts)]="sortingDefs"
  (filterSubmit)="onFilterSubmit()"
  (submit)="onSubmit()"
  (create)="onCreate()"
  (delete)="onDelete($event)"
  (restore)="onRestore($event)"
>
  <ng-template #filterTpl>...</ng-template>
  <ng-template #toolTpl>...</ng-template>

  <sd-sheet-column ...>
    <ng-template [cell]="items()" let-item="item">...</ng-template>
  </sd-sheet-column>
</sd-crud-list>
```

### 슬롯 약속

| 슬롯                | 용도                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| `#filterTpl`        | 검색 폼 필드. 있으면 상단에 조회 버튼과 함께 노출.                         |
| `#toolTpl`          | 등록/삭제 버튼 옆 추가 도구 버튼.                                          |
| `#commandTpl`       | 상단(또는 modal/control 모드의 명령 영역) 추가 액션 버튼.                  |
| `#bottomCommandTpl` | modal 하단 좌측 영역. modal + selectMode 면 "선택 해제/확인" 과 함께 표시. |

`<sd-sheet-column>` 은 `<sd-crud-list>` 의 직속 자식으로 두면 내부 시트로 자동 투영된다.

### viewType 별 동작

- **`'page'`** — 라우팅 진입 단위. 상단에 저장 버튼.
- **`'control'`** — view 안에 임베드. 명령 영역에 저장 버튼.
- **`'modal'`** — 모달. `selectMode` 와 함께 쓰면 close 페이로드 `{ selectedKeys }` 자동 처리.

### 모달 선택 모드

`viewType="modal"` + `selectMode` 지정 시:

- `single` — 행 클릭 즉시 modal close.
- `multi` — 하단 "확인(N)" 버튼이 close 발생.

호출측은 `_sdModal.showAsync(...)` 결과로 `{ selectedKeys }` 페이로드 회수.

## `sd-crud-detail`

단일 레코드 편집 화면의 표준 골격. 폼 래핑 + CTRL+S/저장 버튼 + 모달의 "확인" 버튼 자동 처리.

### 표준 호출

```html
<sd-crud-detail
  [(ready)]="ready"
  [initialized]="initialized()"
  [(busyCount)]="busyCount"
  [restricted]="!perms().includes('use')"
  [readonly]="!canEdit()"
  [viewType]="viewType()"
  (submit)="onSubmit()"
>
  <ng-template #contentTpl>
    <!-- 폼 본문 -->
  </ng-template>
</sd-crud-detail>
```

### 슬롯 약속

| 슬롯                 | 용도                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `#contentTpl` (필수) | 폼 본문. `readonly` 면 `<sd-form>` 래핑 없이 그냥 표시된다.       |
| `#commandTpl`        | 상단/명령 영역 추가 버튼.                                         |
| `#bottomCommandTpl`  | modal 하단 좌측. modal 일 때 우측 "확인" 버튼이 항상 자동 추가됨. |

### viewType 별 동작

- **`'page'`** — 라우팅 진입 단위. 상단에 저장 버튼.
- **`'control'`** — view 안에 임베드. 명령 영역에 저장 버튼.
- **`'modal'`** — 모달. 하단 우측 "확인" 버튼이 자동.
