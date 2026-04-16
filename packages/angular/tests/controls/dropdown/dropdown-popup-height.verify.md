# Feature 3.1 sd-dropdown-popup 높이 제한 복원 — LLM 검증

## 검증 항목

- [x] sd-dropdown-popup 템플릿에 `(sdResize)="onResize()"` 바인딩 존재: `sd-dropdown-popup.ts:21` — `<div (sdResize)="onResize()">` 확인
- [x] onResize() 메서드가 clientHeight > 300 조건으로 height 제한: `sd-dropdown-popup.ts:98-106` — `divEl.clientHeight > 300`이면 `el.style.height = "300px"`, 아니면 `removeProperty("height")` 확인
- [x] 내부 div에 `overflow: auto` CSS 존재 (스크롤 가능): `sd-dropdown-popup.ts:48` — `> div { overflow: auto; }` 확인
- [x] sd-dropdown `_updatePopupPosition()`에서 maxHeight/maxWidth/overflow 미설정: `sd-dropdown.ts:211-220` — `Object.assign`에 top/bottom/left/right/minWidth/opacity/pointerEvents/transform만 포함, maxHeight/maxWidth/overflow 없음 확인
- [x] sd-dropdown `_removePopup()`에서 maxHeight/maxWidth/overflow 리셋 미포함: `sd-dropdown.ts:284-293` — 리셋 대상에 top/bottom/left/right/minWidth/opacity/pointerEvents/transform만 포함 확인
- [x] ElementRef inject 추가: `sd-dropdown-popup.ts:92` — `private readonly _elRef = inject(ElementRef<HTMLElement>)` 확인
