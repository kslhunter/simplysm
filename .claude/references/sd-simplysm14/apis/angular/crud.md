# @simplysm/angular — CRUD 화면 골격·상태프리셋·권한표

업무 목록/상세 화면의 공통 골격(탑바·busy·권한 제한·도구바)과 보조 컴포넌트. 모두 `viewType = input.required<SdViewType>()` 로 page/modal/control 맥락을 받음(`injectViewTypeSignal()` 결과 전달). 화면 진입 시 공유 데이터 준비를 대기하고 `ready` 로 알림.

## SdBaseContainer

`<sd-base-container [viewType]="...">` — 가장 단순한 화면 컨테이너(탑바 + busy + 권한제한 + 도구바).
- ready = model(false) — 공유 데이터 대기 완료 시 true. 화면 본문 표시 조건에.
- initialized: boolean — 데이터 로드 완료 여부(false 면 busy).
- busyCount = model(0) — busy 카운트(>0 면 오버레이).
- restricted: boolean — true 면 "사용권한 없음" 안내만 표시.
- viewType: input.required<SdViewType> — page 면 탑바(제목+topbarTpl) 감싸고, 아니면 본문만.
- (contentChild) topbarTpl/commandTpl/contentTpl/bottomCommandTpl — 탑바 우측/상단 명령/본문/하단 명령 영역.

## SdCrudDetail

`<sd-crud-detail [viewType]="...">` — 단건 상세/편집 화면(폼 포함).
- ready/initialized/busyCount/restricted/viewType — 위와 동일.
- readonly: boolean — 읽기 전용.
- (viewChild) formCtrl: SdForm — 내부 폼.
- (output) submit — 폼 제출(검증 통과).
- (contentChild) commandTpl/contentTpl/bottomCommandTpl.

## SdCrudList<TItem, TKey>

`<sd-crud-list [viewType]="...">` — 목록 화면(필터 폼 + 시트 + 페이징 + 선택/삭제/복원).
- ready/initialized/busyCount/restricted/viewType/readonly — 위와 동일.
- selectMode?: "single"|"multi" — 행 선택 모드.
- key: input.required<string> — 시트 설정 영속 키.
- (viewChild) formCtrl: SdForm.
- (output) filterSubmit — 필터 폼 제출. submit — 일반 제출. create — 추가 버튼. delete: TItem[] — 삭제 대상. restore: TItem[] — 복원 대상.
- items: TItem[] — 목록 데이터.
- selectedKeys = model<NonNullable<TKey>[]>([]) — 선택 키.
- currDeletedItems: TItem[] — 현재 삭제표시된 항목(복원 대상 표시).
- currentPage = model(0) / totalPageCount / itemsPerPage / visiblePageCount(기본 10) — 페이징(시트로 위임).
- sorts = model<SortingDef[]>([]) — 정렬 상태.
- trackByFn: input.required<(item) => TKey> — 행 키.
- (contentChild) commandTpl/filterTpl/toolTpl/bottomCommandTpl, `sd-sheet-column` 들 — 명령/필터/도구/하단 명령 영역과 시트 컬럼.

## SdStatePreset<TState>

`<sd-state-preset [key]="..." [(state)]="...">` — 화면 상태(필터 등) 프리셋 저장/적용 바.
- key: input.required<string> — 프리셋 영속 키(`SdSystemConfigProvider`).
- state = model.required<TState> — 현재 상태(저장·적용 대상).
- size?: "sm"|"lg".
- ★ 버튼으로 현재 상태를 이름 붙여 저장, 프리셋 클릭 시 상태 적용, 각 프리셋 저장(덮어쓰기)·삭제. 타입 `SdStatePresetDef<TState> = { name: string; state: TState }`.

## SdPermissionTable<TModule>

`<sd-permission-table [items]="...">` — 권한(use/edit) 편집 테이블.
- value = model<Record<string, boolean>>({}) — `<코드>.<use|edit>` → 허용 맵.
- items: SdPermission<TModule>[] — 권한 트리(`SdAppStructureProvider.getPermissionsByStructure` 결과).
- disabled: boolean — 편집 비활성.
