# @simplysm/angular — CRUD 화면 표준 골격

목록/단건 화면의 표준 컨테이너 골격. `sd-base-container`(공통 셸) 위에 `sd-crud-list`(목록), `sd-crud-detail`(단건)이 얹힘. 표준 시그널(ready/initialized/busyCount/viewType)·page/modal/control 컨텍스트별 탑바/하단바 자동 구성·CTRL+S 저장을 내장. 화면 데이터 흐름·시그널 전파 규약은 client-component.md / client-crud.md 를 따름.

## SdBaseContainer (`sd-base-container`)

모든 화면의 공통 셸. busy 오버레이 + 권한 제한 표시 + (page 모드) 탑바 + 슬롯(content/command/bottom) 구성. 공유 데이터 로드 완료까지 ready 를 지연.

- `ready: model<boolean>` — 데이터 로드 시작 허용 시점. 공유데이터 대기 후 자동 true(자식 effect 발화 트리거). 부모↔자식 전파.
- `initialized: input<boolean>` — 첫 로드 완료 여부. true 여야 콘텐츠 렌더(아니면 busy).
- `busyCount: model<number>` — 진행 중 작업 수(>0 이면 busy). 자식과 양방향.
- `restricted: input<boolean>` — true 면 콘텐츠 대신 "사용권한 없음" 안내 표시. `[restricted]="!perms().includes('use')"`.
- `viewType: input.required<SdViewType>` — page/modal/control. page 면 탑바 + 제목 표시. `injectViewTypeSignal()` 결과 전달.
- 슬롯: `#topbarTpl`(page 탑바 우측), `#commandTpl`(상단 명령줄), `#contentTpl`(본문), `#bottomCommandTpl`(하단 명령줄).
- 사용: view 합성의 루트(client-component.md). 직접 화면을 list/detail 없이 짤 때 사용.

## SdCrudList<TItem, TKey> (`sd-crud-list`)

목록 화면 골격. 내부에 `sd-sheet` + 검색 폼 + 등록/삭제/복구 버튼 + (모달 모드) 선택 확정 바를 내장. 투영한 `<sd-sheet-column>` 을 시트로 전달. CTRL+S 로 저장 트리거.

- 표준 시그널: `ready: model<boolean>`, `initialized: input<boolean>`, `busyCount: model<number>`, `restricted: input<boolean>`, `viewType: input.required<SdViewType>`.
- `readonly: input<boolean>` — true 면 저장/등록/삭제 UI·편집 동작 제거(조회 전용).
- `inlineEdit: input<boolean>`(기본 true) — 시트 인라인 편집 chrome(폼 래핑 + 저장 버튼/CTRL+S + per-row 삭제 컬럼) 노출 여부. false 면 시트를 조회·선택 전용으로 두고, 편집은 호스트가 selectedKeys 등으로 모달·상세를 열어 처리(등록·선택 삭제·복구·필터·페이징은 유지, submit 출력 미발화). `readonly` 와 직교.
- `selectMode: "single"|"multi"` — 행 선택 모드. modal 모드 + 지정 시 하단에 선택 해제/확인 바. single 은 행 클릭 자동 선택, 미지정+편집 가능이면 multi 기본.
- `key: input.required<string>` — 시트 설정 저장 키(`<key>-sheet` 로 시트에 전달).
- `items: TItem[]` — 행 데이터. `selectedKeys: model<NonNullable<TKey>[]>` — 선택 키.
- `currDeletedItems: TItem[]` — 현재 삭제 상태 항목(취소선 표시 + 선택 시 복구 버튼 노출).
- 페이징/정렬: `currentPage: model<number>`, `totalPageCount: input<number>`(서버 페이징), `itemsPerPage: input<number>`(클라 페이징), `visiblePageCount: input<number>`(기본 10), `sorts: model<SortingDef[]>`. 서버/클라 페이징 택일은 client-component.md.
- `trackByFn: input.required<(item: TItem) => TKey>` — 행 키 함수.
- 출력: `filterSubmit: output()`(검색 폼 submit), `submit: output()`(저장 폼 submit/CTRL+S), `create: output()`(등록), `delete: output<TItem[]>`(선택/행 삭제), `restore: output<TItem[]>`(복구).
- 슬롯: `#commandTpl`(상단 추가 버튼), `#filterTpl`(검색 폼 항목), `#toolTpl`(시트 위 도구 버튼), `#bottomCommandTpl`(하단), 그리고 직속 `<sd-sheet-column>`.
- 사용(client-crud.md): `<sd-crud-list [key]="'goods'" [items]="items()" [(selectedKeys)]="selectedKeys" [trackByFn]="trackByFn" [viewType]="viewType()" ... (create)="onCreate()" (delete)="onDelete($event)"><ng-template #filterTpl>...</ng-template><sd-sheet-column .../></sd-crud-list>`.

## SdCrudDetail (`sd-crud-detail`)

단건 보기/편집 화면 골격. 내부에 `sd-form`(편집 시) + page 탑바/modal 하단 확인 버튼을 컨텍스트별 자동 구성. CTRL+S 저장.

- 표준 시그널: `ready: model<boolean>`, `initialized: input<boolean>`, `busyCount: model<number>`, `restricted: input<boolean>`, `viewType: input.required<SdViewType>`.
- `readonly: input<boolean>` — true 면 form 없이 표시만(저장 버튼 제거).
- `submit: output()` — 저장 폼 submit/CTRL+S/확인 버튼 클릭 시 발화.
- 슬롯: `#commandTpl`(명령줄), `#contentTpl`(본문 폼), `#bottomCommandTpl`(하단 추가).
- 사용: `<sd-crud-detail [viewType]="viewType()" [initialized]="initialized()" [(busyCount)]="busyCount" (submit)="onSubmit()"><ng-template #contentTpl><div class="form-table">...</div></ng-template></sd-crud-detail>`. 식별자 로드·원본 스냅샷·이탈 가드 등 데이터 흐름은 client-component.md "detail 데이터 흐름".
