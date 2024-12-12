# @simplysm/sd-angular

Angular를 위한 심플리즘 패키지입니다. 이 패키지는 Angular 애플리케이션 개발을 위한 다양한 유틸리티, 컴포넌트 및 서비스를 제공합니다.

## 설치

```bash
yarn install @simplysm/sd-angular
```

## 주요 기능

이 패키지는 다음과 같은 주요 기능들을 포함하고 있습니다:

### 고급 컴포넌트 (adv/)
| 파일명 | 설명 | [⚠️](#Deprecated) |
|----------|------|:------------:|
| base/sd-modal-base.control.ts | 모달 기본 컨트롤 | |
| base/sd-page-base.control.ts | 페이지 기본 컨트롤 | |
| sd-base-container.control.ts | 기본 컨테이너 컨트롤 | ⚠️ |
| sd-permission-table.control.ts | 권한 테이블 컨트롤 | |
| shared-data/sd-shared-data.provider.ts | 공유 데이터 프로바이더 | |
| shared-data/sd-shared-data-select.control.ts | 공유 데이터 선택 컨트롤 | |
| shared-data/sd-shared-data-select-view.control.ts | 공유 데이터 선택 뷰 컨트롤 | |
| view/detail-modal/sd-detail-modal.abstract.ts | 상세 모달 추상 클래스 | |
| view/detail-modal/sd-detail-modal-base.control.ts | 상세 모달 기본 컨트롤 | |
| view/sd-view-model.abstract.ts | 뷰 모델 추상 클래스 | |
| view/sheet-view/sd-sheet-view.abstract.ts | 시트 뷰 추상 클래스 | |
| view/sheet-view/sd-sheet-view-base.control.ts | 시트 뷰 기본 컨트롤 | |
| view/sheet-view/sd-sheet-view-column.template-directive.ts | 시트 뷰 컬럼 템플릿 디렉티브 | |
| view/sheet-view/sd-sheet-view-filter.template-directive.ts | 시트 뷰 필터 템플릿 디렉티브 | |

### 기본 컨트롤 (controls/)
| 파일명 | 설명 | [⚠️](#Deprecated) |
|----------|------|:------------:|
| barcode/sd-barcode.control.ts | 바코드 컨트롤 | |
| barcode/sd-qrcode.control.ts | QR코드 컨트롤 | |
| busy/sd-busy.provider.ts | 로딩 프로바이더 | |
| busy/sd-busy-container.control.ts | 로딩 컨테이너 컨트롤 | |
| button/sd-additional-button.control.ts | 추가 버튼 컨트롤 | |
| button/sd-anchor.control.ts | 앵커 컨트롤 | |
| button/sd-button.control.ts | 버튼 컨트롤 | |
| card/sd-card.control.ts | 카드 컨트롤 | |
| checkbox/sd-checkbox.control.ts | 체크박스 컨트롤 | |
| checkbox/sd-checkbox-group.control.ts | 체크박스 그룹 컨트롤 | |
| checkbox/sd-checkbox-group-item.control.ts | 체크박스 그룹 아이템 컨트롤 | |
| collapse/sd-collapse.control.ts | 접기/펼치기 컨트롤 | |
| collapse/sd-collapse-icon.control.ts | 접기/펼치기 아이콘 컨트롤 | |
| dropdown/sd-dropdown.control.ts | 드롭다운 컨트롤 | |
| dropdown/sd-dropdown-popup.control.ts | 드롭다운 팝업 컨트롤 | |
| echarts/sd-echarts.control.ts | ECharts 컨트롤 | |
| editor/sd-content-editor.control.ts | 콘텐츠 에디터 컨트롤 | |
| editor/sd-quill-editor.control.ts | Quill 에디터 컨트롤 | |
| form/sd-form.control.ts | 폼 컨트롤 | |
| form-layout/sd-form-box.control.ts | 폼 박스 컨트롤 | |
| form-layout/sd-form-box-item.control.ts | 폼 박스 아이템 컨트롤 | |
| form-layout/sd-form-table.control.ts | 폼 테이블 컨트롤 | |
| icon/sd-icon.control.ts | 아이콘 컨트롤 | |
| icon/sd-icon-layers.control.ts | 아이콘 레이어 컨트롤 | |
| icon/sd-icon-stack.control.ts | 아이콘 스택 컨트롤 | |
| input/sd-range.control.ts | 범위 입력 컨트롤 | |
| input/sd-textarea.control.ts | 텍스트영역 컨트롤 | |
| input/sd-textfield.control.ts | 텍스트필드 컨트롤 | |
| kanban/sd-kanban.control.ts | 칸반 컨트롤 | |
| kanban/sd-kanban-board.control.ts | 칸반 보드 컨트롤 | |
| kanban/sd-kanban-lane.control.ts | 칸반 레인 컨트롤 | |
| label/sd-label.control.ts | 라벨 컨트롤 | |
| layout/sd-dock.control.ts | 도크 컨트롤 | |
| layout/sd-dock-container.control.ts | 도크 컨테이너 컨트롤 | |
| layout/sd-gap.control.ts | 간격 컨트롤 | |
| layout/sd-grid.control.ts | 그리드 컨트롤 | |
| layout/sd-grid-item.control.ts | 그리드 아이템 컨트롤 | |
| layout/sd-pane.control.ts | 패널 컨트롤 | |
| list/sd-list.control.ts | 리스트 컨트롤 | |
| list/sd-list-item.control.ts | 리스트 아이템 컨트롤 | |
| modal/sd-modal.control.ts | 모달 컨트롤 | |
| modal/sd-modal.provider.ts | 모달 프로바이더 | |
| note/sd-note.control.ts | 노트 컨트롤 | |
| pagination/sd-pagination.control.ts | 페이지네이션 컨트롤 | |
| progress/sd-progress.control.ts | 진행 상태 컨트롤 | |
| progress/sd-progress-item.control.ts | 진행 상태 아이템 컨트롤 | |
| sd-sidebar/sd-sidebar.control.ts | 사이드바 ��트롤 | |
| sd-sidebar/sd-sidebar-container.control.ts | 사이드바 컨테이너 컨트롤 | |
| sd-sidebar/sd-sidebar-menu.control.ts | 사이드바 메뉴 컨트롤 | |
| sd-sidebar/sd-sidebar-user.control.ts | 사이드바 사용자 컨트롤 | |
| select/sd-select-button.control.ts | 선택 버튼 컨트롤 | |
| select/sd-select-control.ts | 선택 컨트롤 | |
| select/sd-select-item.control.ts | 선택 아이템 컨트롤 | |
| sheet/sd-sheet.control.ts | 시트 컨트롤 | |
| sheet/sd-sheet-column.directive.ts | 시트 컬럼 디렉티브 | |
| sheet/sd-sheet-column-cell.template-directive.ts | 시트 컬럼 셀 템플릿 디렉티브 | |
| sheet/sd-sheet-config.modal.ts | 시트 설정 모달 | |
| state-preset/sd-state-preset.control.ts | 상태 프리셋 컨트롤 | |
| switch/sd-switch.control.ts | 스위치 컨트롤 | |
| tab/sd-tab.control.ts | 탭 컨트롤 | |
| tab/sd-tab-item.control.ts | 탭 아이템 컨트롤 | |
| tab/sd-tabview.control.ts | 탭 뷰 컨트롤 | |
| tab/sd-tabview-item.control.ts | 탭 뷰 아이템 컨트롤 | |
| tab/sd-view.control.ts | 뷰 컨트롤 | |
| tab/sd-view-item.control.ts | 뷰 아이템 컨트롤 | |
| table/sd-table.control.ts | 테이블 컨트롤 | |
| theme/sd-theme.provider.ts | 테마 프로바이더 | |
| theme/sd-theme-selector.control.ts | 테마 선택기 컨트롤 | |
| toast/sd-toast.control.ts | 토스트 컨트롤 | |
| toast/sd-toast.provider.ts | 토스트 프로바이더 | |
| toast/sd-toast-container.control.ts | 토스트 컨테이너 컨트롤 | |
| topbar/sd-topbar.control.ts | 상단 바 컨트롤 | |
| topbar/sd-topbar-container.control.ts | 상단 바 컨테이너 컨트롤 | |
| topbar/sd-topbar-menu.control.ts | 상단 바 메뉴 컨트롤 | |
| topbar/sd-topbar-nav.control.ts | 상단 바 네비게이션 컨트롤 | |
| topbar/sd-topbar-tab.control.ts | 상단 바 탭 컨트롤 | |

### 디렉티브 (directives/)
| 파일명 | 설명 | [⚠️](#Deprecated) |
|----------|------|:------------:|
| sd-animation-delay.directive.ts | 애니메이션 지연 디렉티브 | |
| sd-events.directive.ts | 이벤트 처리 디렉티브 | |
| sd-item-of.template-directive.ts | 아이템 반복 템플릿 디렉티브 | |
| sd-router-link.directive.ts | 라우터 링크 디렉티브 | |
| sd-typed.template-directive.ts | 타입 지정 템플릿 디렉티브 | |
| sd-use-ripple.directive.ts | 리플 효과 디렉티브 | |

### 모달 (modals/)
| 파일명 | 설명 | [⚠️](#Deprecated) |
|----------|------|:------------:|
| sd-address-search.modal.ts | 주소 검색 모달 | |

### 파이프 (pipes/)
| 파일명 | 설명 | [⚠️](#Deprecated) |
|----------|------|:------------:|
| format.pipe.ts | 데이터 포맷팅 파이프 | |

### 플러그인 (plugins/)
| 파일명 | 설명 | [⚠️](#Deprecated) |
|----------|------|:------------:|
| commands/sd-insert-command.event-plugin.ts | 삽입 명령 이벤트 플러그인 | |
| commands/sd-refresh-command.event-plugin.ts | 새로고침 명령 이벤트 플러그인 | |
| commands/sd-save-command.event-plugin.ts | 저장 명령 이벤트 플러그인 | |
| events/sd-backbutton.event-plugin.ts | 뒤로가기 버튼 이벤트 플러그인 | |
| events/sd-option.event-plugin.ts | 옵션 이벤트 플러그인 | |
| events/sd-resize.event-plugin.ts | 크기 조정 이벤트 플러그인 | |
| sd-global-error-handler.plugin.ts | 전역 에러 핸들러 플러그인 | |

### 프로바이더 (providers/)
| 파일명 | 설명 | [⚠️](#Deprecated) |
|----------|------|:------------:|
| sd-angular-config.provider.ts | Angular 설정 프로바이더 | |
| sd-app-structure.provider.ts | 앱 구조 프로바이더 | |
| sd-background.provider.ts | 백그라운드 프로바이더 | |
| sd-file-dialog.provider.ts | 파일 다이얼로그 프로바이더 | |

### 유틸리티 (utils/)
| 파일명 | 설명 | [⚠️](#Deprecated) |
|----------|------|:------------:|
| injectPerms.ts | 권한 주입 유틸리티 | ⚠️ |
| $hooks.ts | 훅 관련 유틸리티 | |
| SdAppStructureUtil.ts | 앱 구조 관련 유틸리티 | |
| tramsforms.ts | 변환 관련 유틸리티 | |
| injectPageCode$.ts | 페이지 코드 주입 유틸리티 | |
| injectParent.ts | 부모 요소 주입 유틸리티 | |
| injectElementResize.ts | 요소 크기 조정 주입 유틸리티 | |
| useRipple.ts | 리플 효과 사용 유틸리티 | |
| injectParamMap$.ts | 파라미터 맵 주입 유틸리티 | |
| injectQueryParamMap$.ts | 쿼리 파라미터 맵 주입 유틸리티 | |
| injectElementRef.ts | 요소 참조 주입 유틸리티 | |
| waitRepaint.ts | 리페인트 대기 유틸리티 | |

## 의존성

### 주요 의존성
- [Angular](https://www.npmjs.com/package/@angular/core) 18.2.x
- [FontAwesome](https://www.npmjs.com/package/@fortawesome/fontawesome-svg-core) 6.7.x  
- [ECharts](https://www.npmjs.com/package/echarts) 5.5.x
- [Quill](https://www.npmjs.com/package/quill) 2.0.x
- [JsBarcode](https://www.npmjs.com/package/jsbarcode) 3.11.x
- [jsPDF](https://www.npmjs.com/package/jspdf) 2.5.x
- [QRCode](https://www.npmjs.com/package/qrcode) 1.5.x

### 심플리즘 패키지 의존성
- @simplysm/sd-core-browser
- @simplysm/sd-core-common
- @simplysm/sd-excel
- @simplysm/sd-service-client
- @simplysm/sd-service-common

## 사용 방법

애플리케이션의 모듈에서 다음과 같이 설정하세요:

```typescript
import { provideSdAngular } from '@simplysm/sd-angular';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  // ...
})
export class AppPage { }

bootstrapApplication(AppPage, {
  providers: [
    provideSdAngular({
      clientName: "client-admin", 
      appStructure: [],
      defaultTheme: "modern",
    })
  ]
});
```

## 라이선스

MIT 라이선스

## 작성자

김석래
