# SdDataDetailControl 컴포넌트 — LLM 검증

## 검증 항목

- [x] page 모드 topbar: `#pageTopbarTpl` 내부에 저장(submit 정의 시 + canEdit) / 새로고침 버튼 존재 — L219-232 확인, `@if (parent.canEdit() && parent.submit)` 조건으로 저장 버튼 표시, 새로고침은 항상 표시
- [x] modal 모드 하단: `#modalBottomTpl` 내부에 삭제/복구 + 확인 버튼 존재 — L310-334 확인, `@if (parent.canEdit())` 조건으로 canEdit 시에만 렌더링
- [x] modal 모드 액션: `#modalActionTpl` 내부에 새로고침 앵커 존재 — L336-345 확인, `@if (parent.canEdit())` 블록 내부
- [x] control 모드 toolbar: `@if ((parent.viewType() === "control" && parent.canEdit()) || toolTplRef() != null)` 조건으로 toolbar 표시 — L236 확인, control+canEdit 또는 toolTpl 존재 시 표시
- [x] control 모드 toolbar 내 버튼: 저장/새로고침(submit 정의 시), 삭제/복구(조건부) — L238-267 확인
- [x] toolTpl 커스텀 영역: `<ng-template [ngTemplateOutlet]="toolTplRef() ?? null" />` — L270 확인
- [x] prevTpl/nextTpl: prevTplRef/nextTplRef null 체크 후 ngTemplateOutlet — L274-277, L301-304 확인
- [x] contentTpl (필수): `contentChild.required` + `<ng-template [ngTemplateOutlet]="contentTplRef()" />` — L357, L282 확인
- [x] 최종수정 정보: `@if (parent.dataInfo()?.lastModifiedAt || parent.dataInfo()?.lastModifiedBy)` 조건, format 파이프 적용 — L286-298 확인, modal 시 bg-theme-gray-lightest 배경 L289
- [x] submit 미정의 시 저장 버튼 미표시: `@if (parent.canEdit() && parent.submit)` (page topbar L220), `@if (parent.submit)` (control toolbar L239) — submit이 undefined이면 조건 false
- [x] isNew 시 삭제 버튼 미표시: `@if (!parent.dataInfo()?.isNew && parent.toggleDelete && ...)` — L252(control), L313(modal) 확인, isNew=true이면 첫 조건 false
- [x] canDelete false 시 삭제 버튼 미표시: `(!parent.canDelete || parent.canDelete())` — L254(control), L315(modal) 확인, canDelete가 정의되어 있고 false 반환 시 조건 false
- [x] toggleDelete 미정의 시 삭제/복구 미표시: `parent.toggleDelete &&` 조건 — L253(control), L314(modal) 확인, undefined이면 조건 false
- [x] 호스트 커맨드 바인딩: `(sdRefreshCommand)` → `onRefreshButtonClick()`, `(sdSaveCommand)` → `onSubmitButtonClick()` — L208-209 확인
- [x] injectParent: `parent = injectParent<AbsSdDataDetail<any>>()` — L351 확인
- [x] actionTplRef 동기화: effect에서 `this.parent.actionTplRef = this.modalActionTplRef()` — L363-364 확인
- [x] SdFormControl 통합: `#formCtrl` viewChild + `requestSubmit()` + `(submit)="onSubmit()"` — L281, L353, L380-382 확인
- [x] v14 import 경로: `@simplysm/core-common` (obj, DateTime), `../../core/utils/injectParent`, `../../core/utils/useViewTypeSignal`, `../../core/utils/setups/setupCanDeactivate` — L17, L22, L24, L25 확인
- [x] index.ts export: SdDataDetailControl, AbsSdDataDetail, ISdDataDetailDataInfo 모두 export — packages/angular/src/index.ts L79-82 확인
