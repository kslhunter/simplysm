# 코드 리뷰: v12-migration-miss-restore

## LOGIC-001 [Medium] sd-data-sheet 내부 템플릿에서 headerStyle/tooltip/headerTplRef 미전파

- **위치:** packages/angular/src/data/data-sheet/sd-data-sheet.ts:244-253

`SdDataSheetColumn`은 `SdSheetColumn`을 상속하여 `headerStyle`, `tooltip`, `headerTplRef`를 모두 input/contentChild로 보유한다. 그러나 `sd-data-sheet.ts` 내부 템플릿에서 사용자의 `<sd-data-sheet-column>`을 렌더링할 때, 내부적으로 새로운 `<sd-sheet-column>`을 생성하면서 이 세 필드를 전파하지 않는다.

현재 전파되는 필드: `key`, `fixed`, `header`, `width`, `disableSorting`, `disableResizing`, `hidden`, `collapse`
누락된 필드: `headerStyle`, `tooltip`, `headerTplRef`

```html
<!-- 현재 상태 (sd-data-sheet.ts:244-253) -->
<sd-sheet-column
  [key]="columnControl.key()"
  [fixed]="columnControl.fixed()"
  [header]="columnControl.header()"
  [width]="columnControl.width()"
  [disableSorting]="columnControl.disableSorting()"
  [disableResizing]="columnControl.disableResizing()"
  [hidden]="columnControl.hidden()"
  [collapse]="columnControl.collapse()"
>
  <!-- headerStyle, tooltip, headerTplRef 바인딩 누락 -->
```

소비앱에서 `<sd-data-sheet-column [headerStyle]="'color: red'" [tooltip]="'설명'">`으로 사용 시, TypeScript/Angular 컴파일 에러 없이 input이 수락되지만, 실제 렌더링에는 반영되지 않아 사용자가 원인을 파악하기 어렵다. `summaryTplRef`는 동일 위치(line 255-258)에서 이미 전파 패턴이 구현되어 있으므로, `headerTplRef`도 동일 방식으로 전파가 필요하다.

**개선 방향:** sd-data-sheet.ts 내부 `<sd-sheet-column>` 템플릿에 `[headerStyle]`, `[tooltip]` 바인딩을 추가하고, `headerTplRef`는 기존 `summaryTplRef` 전파 패턴(`@if + nested ng-template`)을 따라 추가한다.

---
