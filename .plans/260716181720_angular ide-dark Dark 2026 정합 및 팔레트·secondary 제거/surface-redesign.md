# Surface/색 토큰 아키텍처 재설계 — VS Code Dark 2026 정합 (소스 기반)

출처: 24개 컨트롤 **VS Code 실제 위젯 소스 CSS ↔ 우리 소스** 대조 워크플로(`ide-dark-source-audit`, wm4e4pn7r). 2026-07-16.
(이전 `w5enap3i1`(토큰값만) 결과는 소스 미확인이라 오류 있어 폐기 — 이 문서가 대체.)

## 핵심 진단 — 값 오류가 아니라 "적용 방식" 7패턴

1. **chrome 존 surface 역할 부재(최대 결함)** — sidebar·topbar·tab strip·sheet header·kanban lane·calendar header·editor toolbar 가 전부 배경 미지정→canvas 흡수. VS Code 는 sideBar/titleBar/statusBar/panel/tabsBackground = #191A1B 명시 칠함.
2. **상태 = 흰알파 + solid inactive** — hover #FFFFFF14 / active·focus #FFFFFF22 / inactiveSelection #2C2D2E(solid).
3. **위젯 보더 = solid #2A2B2C** — card/modal/dropdown 흰알파 폐기.
4. **중립 진행/로딩 = #878889**(progressBar) — primary 파랑 아님.
5. **단일 accent = focusBorder #3994BCB3 / activeBorderTop #3994BC**.
6. **아이콘/캐럿/muted 헤더 = #8C8C8C**(tx-muted).
7. **적용 대상 교정** — 보더 래퍼 이동(input), 행/셀 outline focus, 없는 hover 오버레이 추가, 버튼/탭 font-weight bold 제거.

원칙: 신설 최소, 대부분 배선 교체.

## 신설 토큰(소스 근거 강함)

- `--sd-bg-chrome`(sideBar/titleBar #191A1B; 라이트 zinc-100 — control=white 와 갈리므로 재사용 불가): sidebar·topbar·sheet헤더·kanban lane·calendar헤더·tab strip.
- `--sd-bg-state-selected-inactive`(#2C2D2E solid): 포커스 없는 선택행.
- `--sd-bg-drop-target`(#3994BC1A): kanban 드롭 자리.
- (fine) `--sd-bg-editor`(#121314, 라이트 white), `--sd-bg-selection`(#276782dd).

## ide-dark 값 교정(기존 토큰)

- busy-indicator .13흰알파→#878889. bg-disabled #202122→#161718. card/modal/dropdown bd 흰알파→#2A2B2C solid.

## 3테마 값·컨트롤별 CSS 변경·미결정 §4

(전문은 워크플로 산출 wm4e4pn7r.output 의 design 필드 — 신설/교정 3테마 표, chrome존/리스트/폼/위젯/toast·editor·pagination 컨트롤별 파일·변경, §4 미결정 참조.)

## §4 브랜드 포크(사용자 확정 필요)

1. 체크박스·스위치 solid 채움 존치? (VS Code 채움없이 글리프만, box #242526)
2. 탭 언더라인 유지 vs surface 채움
3. 라이트 chrome additive(zinc-100) vs 정공법
4. toast 통짜채움 vs 중립+severity
5. label gray 칩 가독성(2.9:1)
6. badge = primary #297AA0 통합 vs #307E9F 신설
7. card focus 상단 액센트 라인 유지 vs 전체 outline
8. ripple 존폐 / textfield 검증 표현(외부점 vs 필드보더재색+메시지박스)

## 소스 확인 실패(근거 부족·보류)

- toolbar.css·listWidget.css 404(경로 변경) → 툴바 hover·list 행 상태색은 간접 확인. 정확 적용지점 미확정.
- radius(위젯 5px/다이얼로그 8px) → NONSCOPE-003(치수 IDE 컨셉 확정)상 의도적 차이 유지.
- disabled opacity 0.4 vs DEC-009 색치환 → 규약상 의도적 차이 유지.
