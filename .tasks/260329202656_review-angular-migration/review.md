# 코드 리뷰: @simplysm/angular (Feature 1.1~6.3)

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/angular/src/**/*.ts`, `packages/angular/scss/**/*.scss` |
| 일시 | 2026-03-29 20:26 |
| 파일 수 | 118 TS + 30+ SCSS |
| 발견 이슈 | **44건** (Critical 5, Medium 22, Low 17) |

---

## Critical (5건)

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/angular/src/core/utils/setups/setupModelHook.ts:18-22
title: canFn이 Promise<boolean> 반환 시 resolve 값(false)을 무시하고 무조건 set 호출
description: canFn이 Promise<boolean>을 반환할 때 `.then(() => orgSet(value))`로 처리한다. Promise가 false로 resolve되어도 orgSet이 무조건 호출되어 비동기 검증이 항상 통과하는 결과를 낳는다. checkbox 등 canChangeFn을 사용하는 모든 컴포넌트에 영향을 미친다. 또한 Promise reject 시 catch가 없어 unhandled rejection이 발생한다.
suggestion: `.then((allowed) => { if (allowed !== false) orgSet(value); }).catch(/* ErrorHandler 전달 */)`로 수정
```

```
id: LOGIC-002
severity: Critical
category: 로직
location: packages/angular/src/core/plugins/events/sd-resize-event.plugin.ts:23-41
title: IntersectionObserver와 ResizeObserver 간 공유 상태(prevWidth/prevHeight) 경합
description: 두 observer가 prevWidth/prevHeight를 공유하는데, ResizeObserver의 첫 콜백이 IntersectionObserver보다 먼저 호출되면 prevWidth/prevHeight가 이미 업데이트되어 IntersectionObserver 콜백에서 변경 감지가 실패한다. 또한 IntersectionObserver는 최초 1회 observe 후 unobserve하여 이후 재관찰하지 않는다.
suggestion: IntersectionObserver를 제거하고 ResizeObserver만으로 초기 이벤트를 처리하거나, 두 observer 간 상태 분리
```

```
id: LOGIC-003
severity: Critical
category: 로직
location: packages/angular/src/ui/data/sheet/useSheetCellAgent.ts:196
title: navigator.clipboard.writeText에 null 전달 가능
description: `td.textContent`는 null일 수 있다. clipboard.writeText()는 string을 기대하므로, null 전달 시 런타임 에러 또는 "null" 문자열 기록이 발생한다.
suggestion: `td.textContent ?? ""` 사용
```

```
id: SCSS-001
severity: Critical
category: 로직
location: packages/angular/scss/themes/_variables-dark.scss:29-40
title: 다크 테마에 --trans-lightest CSS 변수 누락
description: 라이트 테마 trans 맵에는 lightest 키(rgba(0,0,0,0.03))가 있지만 다크 테마에는 누락됨. sd-topbar-menu, sd-sidebar-menu, sd-sidebar-user 등에서 사용되어 다크 테마에서 배경이 표시되지 않는 버그 발생.
suggestion: 다크 테마 trans 맵에 lightest: rgba(255, 255, 255, 0.05) 추가
```

```
id: SCSS-002
severity: Critical
category: 로직
location: packages/angular/scss/controls/_table.scss:1-2
title: $border-color-light와 $border-color-dark가 동일한 값 (복사-붙여넣기 오류)
description: 둘 다 var(--theme-gray-lighter)로 설정되어 외곽 테두리와 내부 테두리의 의도적 구분이 무의미해짐.
suggestion: $border-color-dark를 var(--theme-gray-light) 또는 var(--border-color-default) 등으로 수정
```

---

## Medium (22건)

### 로직 (12건)

```
id: LOGIC-004
severity: Medium
category: 로직
location: packages/angular/src/core/plugins/sd-global-error-handler.plugin.ts:16-77
title: handleError가 Error/ErrorEvent/PromiseRejectionEvent 외의 에러 타입을 무시
description: 문자열, 숫자, 일반 객체 등 미처리 타입이 조용히 무시되어 에러가 손실됨.
suggestion: else 분기에서 _displayErrorMessage 또는 _systemLog.writeAsync 호출
```

```
id: LOGIC-005
severity: Medium
category: 로직
location: packages/angular/src/core/provideSdAngular.ts:101-117
title: SW 업데이트 폴링 setTimeout이 앱 destroy 후에도 계속 실행됨
description: clearTimeout 정리 로직이 없고, checkForUpdate() reject 시 catch가 없어 폴링이 영구 중단될 수 있음.
suggestion: DestroyRef.onDestroy에서 clearTimeout, try-finally로 재시도 보장
```

```
id: LOGIC-006
severity: Medium
category: 로직
location: packages/angular/src/core/providers/sd-theme-provider.ts:9
title: document.body.className 덮어쓰기로 다른 클래스가 모두 제거됨
description: body에 부여된 다른 CSS 클래스가 전부 사라짐.
suggestion: classList.toggle("sd-theme-dark", this.dark()) 사용
```

```
id: LOGIC-007
severity: Medium
category: 로직
location: packages/angular/src/core/providers/sd-navigate-window.provider.ts:13
title: features 파라미터와 "_blank" 비교가 의미적으로 부정확
description: features는 windowFeatures 문자열인데 target 값 "_blank"와 비교. 항상 true가 되어 의미 없는 분기.
suggestion: features와 target 파라미터 역할 재정리
```

```
id: LOGIC-008
severity: Medium
category: 로직
location: packages/angular/src/ui/form/input/sd-textfield-type-handlers.ts:148-149
title: number parse에서 "0.0" 같은 중간 입력이 undefined로 소실
description: "0.05" 입력 시 "0.0" 단계에서 값이 날아가는 문제.
suggestion: trailing-zero에만 한정하거나 중간 입력 상태에서 기존 value 유지
```

```
id: LOGIC-009
severity: Medium
category: 로직
location: packages/angular/src/ui/form/input/sd-numpad.control.ts:136-150
title: numpad의 양방향 effect 간 소수점 입력 중 text 덮어쓰기 위험
description: text="1." → parseFloat=1 → toString="1" → text 변경으로 소수점 입력이 소실됨.
suggestion: focused 상태에서 역방향(value→text) 동기화 가드 추가
```

```
id: LOGIC-010
severity: Medium
category: 로직
location: packages/angular/src/ui/form/input/sd-textfield.control.ts:381-392
title: onInputPaste에서 parse 실패 시 input/model 값 불일치
description: 브라우저는 input value를 이미 변경했지만 model은 변경되지 않음.
suggestion: parse 실패 시 input value를 이전 controlValue로 복원
```

```
id: LOGIC-011
severity: Medium
category: 로직
location: packages/angular/src/ui/form/editor/sd-tiptap-editor.control.ts:274-295
title: effect 내 editor 생성 시 DOM 컨테이너가 아직 렌더링되지 않았을 수 있음
description: effect가 DOM 렌더링보다 먼저 실행되면 container가 null이 되어 editor가 영원히 생성되지 않음.
suggestion: afterNextRender 사용 또는 viewChild 기반 의존성 설정
```

```
id: LOGIC-012
severity: Medium
category: 로직
location: packages/angular/src/ui/visual/sd-calendar.control.ts:147-175
title: Calendar dataTable computed에서 42셀 × N아이템 O(42*N) 필터링
description: 매 셀마다 전체 items 배열을 filter하여 대량 데이터에서 성능 저하.
suggestion: Map<tick, T[]>을 한 번 빌드 후 O(1) 조회
```

```
id: LOGIC-013
severity: Medium
category: 로직
location: packages/angular/src/ui/layout/kanban/sd-kanban-lane.control.ts:139
title: isAllSelected가 빈 lane에서 true 반환
description: Array.prototype.every는 빈 배열에서 true를 반환하므로, 항목 없는 lane의 전체 선택 체크박스가 선택 상태로 표시됨.
suggestion: `this.kanbanControls().length > 0 &&` 가드 추가
```

```
id: LOGIC-014
severity: Medium
category: 로직
location: packages/angular/src/ui/data/sheet/useSheetColumnFixing.ts:17-23
title: Column fixing이 px 단위 width만 처리, 다른 단위(em/rem/%)는 무시
description: 고정 컬럼의 width가 px가 아니면 accumulatedLeft에 추가되지 않아 후속 고정 컬럼이 겹침.
suggestion: px width 강제하여 검증/경고하거나, DOM 측정으로 실제 렌더 크기 사용
```

```
id: LOGIC-015
severity: Medium
category: 로직
location: packages/angular/src/ui/visual/sd-progress.control.ts:25
title: Progress bar가 right: 0으로 오른쪽부터 채워짐
description: LTR 기본 UI에서 진행률 바가 오른쪽에서 왼쪽으로 채워져 직관에 반함.
suggestion: right: 0을 left: 0으로 변경
```

### 설계 (6건)

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/angular/src/core/plugins/events/sd-intersection-event.plugin.ts
title: SdIntersectionEventPlugin이 export되지만 provideSdAngular에 미등록
description: 사용자가 (sdIntersection) 이벤트 바인딩 사용 시 플러그인을 찾지 못해 에러 발생.
suggestion: provideSdAngular에 등록하거나 문서에 수동 등록 필요 명시
```

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/angular/src/core/utils/setups/setupCanDeactivate.ts:29
title: routeConfig.canDeactivate를 덮어씀 — 기존 가드 소실
description: 기존에 설정된 canDeactivate 가드 배열을 [canDeactivateFn]으로 대체.
suggestion: 기존 배열에 push하거나 기존 가드 보존
```

```
id: DESIGN-003
severity: Medium
category: 설계
location: packages/angular/src/ui/overlay/toast/sd-toast.provider.ts:259-272
title: toast dismiss에서 transitionend와 setTimeout 양쪽이 _destroyToast 호출 가능
description: 첫 번째 해제 경로 실행 후 다른 경로의 리스너가 정리되지 않음.
suggestion: AbortController 또는 공유 플래그로 첫 해제 시 다른 경로 취소
```

```
id: DESIGN-004
severity: Medium
category: 설계
location: packages/angular/src/ui/overlay/dropdown/sd-dropdown.control.ts:191-214
title: dropdown 위치 계산에서 popup 자체 크기를 고려하지 않음
description: popup이 매우 큰 경우 화면 밖으로 넘칠 수 있음.
suggestion: popup 배치 후 뷰포트 교차 확인하여 maxHeight/maxWidth 동적 조정
```

```
id: DESIGN-005
severity: Medium
category: 설계
location: packages/angular/src/ui/navigation/sidebar/sd-sidebar-container.control.ts:72
title: Router event subscription이 unsubscribe되지 않음
description: 컴포넌트 destroy 시 subscription이 누수됨.
suggestion: takeUntilDestroyed() 또는 DestroyRef.onDestroy() 사용
```

```
id: DESIGN-006
severity: Medium
category: 설계
location: packages/angular/src/core/providers/sd-shared-data.provider.ts:115-138
title: _loadAndListen에서 getter의 Promise reject 시 에러가 소실됨
description: .catch가 없어 unhandled promise rejection 발생.
suggestion: .catch에서 ErrorHandler로 전달 또는 토스트 표시
```

### 일관성 (4건)

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/angular/src/ui/overlay/busy/sd-busy-container.control.ts:76
title: busy-container 배경에 rgba(255,255,255,0.6) 하드코딩 — 다크 테마 미대응
description: 다크 테마에서도 흰색 반투명 배경이 적용됨.
suggestion: CSS 변수 기반 배경색 사용
```

```
id: CONSIST-002
severity: Medium
category: 일관성
location: packages/angular/src/ui/navigation/topbar/sd-topbar.control.ts:55-69
title: topbar 스크롤바 스타일에 rgba 하드코딩 — 다크 테마 미대응
description: 스크롤바 색상이 CSS 변수를 사용하지 않아 다크 테마에서 반전되지 않음.
suggestion: var(--trans-light), var(--trans-default) CSS 변수 사용
```

```
id: CONSIST-003
severity: Medium
category: 일관성
location: packages/angular/scss/commons/_variables.scss:52-53
title: primary와 secondary 테마가 동일한 색상(blue)
description: 두 테마가 동일 값이면 secondary 존재 의미가 불명확.
suggestion: 의도적이라면 주석 명시, 아니면 다른 색상 할당
```

```
id: CONSIST-004
severity: Medium
category: 일관성
location: 다수 파일 (dropdown-popup, dock, tiptap-editor, toast 등)
title: border/outline 외 레이아웃 값에 px 단위 사용 — rem/em 규칙 위반
description: translateY(-10px), min-width: 120px, resize-bar 2px, max-height 300px, max-width 520px 등이 px로 하드코딩.
suggestion: rem/em 단위로 변환
```

---

## Low (17건)

```
id: LOGIC-016
severity: Low
category: 로직
location: packages/angular/src/core/providers/sd-navigate-window.provider.ts:20
title: beforeunload 이벤트 리스너가 open() 호출마다 누적됨
suggestion: AbortController로 정리하거나 단일 리스너 관리
```

```
id: LOGIC-017
severity: Low
category: 로직
location: packages/angular/src/core/providers/sd-service-client-factory.provider.ts:84
title: totalSize가 0일 때 division by zero → Infinity/NaN
suggestion: totalSize === 0 별도 처리
```

```
id: LOGIC-018
severity: Low
category: 로직
location: packages/angular/src/core/plugins/sd-global-error-handler.plugin.ts:88-103
title: _displayErrorMessage에서 innerHTML에 에러 메시지 삽입 시 XSS 가능성
suggestion: textContent 사용 또는 HTML 이스케이프 적용
```

```
id: LOGIC-019
severity: Low
category: 로직
location: packages/angular/src/ui/form/editor/sd-tiptap-editor.control.ts:377-379
title: Underline 확장이 DEFAULT_EXTENSIONS에 누락되어 toggleUnderline 명령이 동작하지 않음
suggestion: DEFAULT_EXTENSIONS에 @tiptap/extension-underline 추가
```

```
id: LOGIC-020
severity: Low
category: 로직
location: packages/angular/src/ui/navigation/pagination/sd-pagination.control.ts:115
title: goToPrevGroup이 이전 그룹의 마지막 페이지로 이동 (goToNextGroup과 비대칭)
suggestion: 이전 그룹의 첫 페이지로 이동하도록 수정
```

```
id: LOGIC-021
severity: Low
category: 로직
location: packages/angular/src/ui/data/sheet/useSheetLayoutEngine.ts:65-116
title: Header 병합 로직이 비최종행에서 텍스트 동일성만 확인 — 다른 논리 그룹 오병합 가능
suggestion: 부모 레벨 헤더 매칭도 확인
```

```
id: LOGIC-022
severity: Low
category: 로직
location: packages/angular/src/ui/layout/kanban/sd-kanban.control.ts:31-32
title: kanban cardHeight()가 초기 렌더 시 0일 수 있어 드래그 오버레이가 높이 0
suggestion: afterNextRender에서 초기 높이 측정
```

```
id: LOGIC-023
severity: Low
category: 로직
location: packages/angular/src/ui/navigation/collapse/sd-collapse.control.ts:49-51
title: collapse 닫힌 상태에서 콘텐츠 높이 변경 시 음수 마진이 stale
suggestion: open 전환 시 높이 재측정
```

```
id: LOGIC-024
severity: Low
category: 로직
location: packages/angular/src/ui/visual/sd-echarts.control.ts:55
title: ECharts setOption이 기본 merge 모드 → 시리즈 감소 시 이전 시리즈 잔존
suggestion: notMerge: true 옵션 또는 입력 제공
```

```
id: PERF-001
severity: Low
category: 성능
location: packages/angular/src/core/utils/useExpandingManager.ts:57
title: isAllExpanded에서 Array.includes로 O(n*m) 비교
suggestion: Set 변환 후 has() 사용
```

```
id: PERF-002
severity: Low
category: 성능
location: packages/angular/src/core/utils/useSelectionManager.ts:30-33
title: isAllSelected에서 Array.includes로 O(n*m) 비교
suggestion: Set 변환 후 has() 사용
```

```
id: PERF-003
severity: Low
category: 성능
location: packages/angular/src/ui/form/select/sd-select-item.control.ts:92-108
title: afterEveryRender에서 매 렌더마다 innerHTML 읽고 signal에 set
suggestion: computed 또는 MutationObserver로 변경 시에만 갱신
```

```
id: CONSIST-005
severity: Low
category: 일관성
location: packages/angular/src/ui/form/checkbox/sd-checkbox.control.ts:294-302, sd-switch.control.ts:138-143
title: checkbox/switch의 Space 키 처리에서 event.preventDefault() 누락 (select-item과 불일치)
suggestion: event.preventDefault() 추가하여 페이지 스크롤 방지
```

```
id: CONSIST-006
severity: Low
category: 일관성
location: packages/angular/src/core/plugins/events/sd-resize-event.plugin.ts:44
title: ResizeObserver는 Chrome 64+ (프로젝트 타겟 Chrome 61과 불일치)
suggestion: 최소 지원 버전을 Chrome 64로 올리거나 대안 사용
```

```
id: CONSIST-007
severity: Low
category: 일관성
location: packages/angular/src/ui/navigation/topbar/sd-topbar-menu.control.ts + sd-sidebar-menu.control.ts
title: getMenuRouterLinkOption / getIsMenuSelected 로직이 두 파일에 동일하게 중복
suggestion: 공통 유틸리티 함수로 추출
```

```
id: CONSIST-008
severity: Low
category: 일관성
location: 다수 컴포넌트 (dropdown, button, label, checkbox 등)
title: 다크 테마 미대응 rgba/color 하드코딩 (rgba(0,0,0,0.3), color: white 등)
suggestion: CSS 변수(--trans-*, --text-trans-rev-*) 사용
```

```
id: CONSIST-009
severity: Low
category: 일관성
location: packages/angular/scss/controls/_grid.scss, 다수 컴포넌트
title: 미디어 쿼리 breakpoint(520px, 800px, 1024px, 1280px)가 분산 하드코딩
suggestion: _variables.scss에 breakpoint 맵 정의하여 SCSS 변수로 참조
```
