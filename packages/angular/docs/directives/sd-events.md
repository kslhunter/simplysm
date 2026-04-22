# `SdEvents`

`.capture`, `.passive`, `.once` 수식어 및 커스텀 이벤트 바인딩을 지원하는 디렉티브. Angular 템플릿에서 해당 이벤트를 사용할 때 자동 매칭된다.

```typescript
@Directive({
  selector: `[click.capture], [scroll.passive], ...`,
})
class SdEvents {}
```

## 지원 이벤트

- 클릭: `click.capture`, `click.once`, `click.capture.once`
- 마우스: `mousedown.capture`, `mouseup.capture`, `mouseover.capture`, `mouseout.capture`
- 키보드: `keydown.capture`, `keyup.capture`
- 포커스: `focus.capture`, `blur.capture`
- 폼: `invalid.capture`
- 스크롤: `scroll.capture`, `scroll.passive`, `scroll.capture.passive`
- 휠: `wheel.passive`, `wheel.capture.passive`
- 터치: `touchstart.passive`, `touchstart.capture.passive`, `touchmove.passive`, `touchmove.capture.passive`, `touchend.passive`
- 드래그: `dragover.capture`, `dragenter.capture`, `dragleave.capture`, `drop.capture`
- 애니메이션: `transitionend.once`, `animationend.once`

> **NOTE:** `sdResize`, `sdSaveCommand`, `sdRefreshCommand`, `sdInsertCommand`는 `SdEvents`에서 분리되어 각각 [`SdResizeDirective`](./sd-resize-directive.md), [`SdIntersectionDirective`](./sd-intersection-directive.md), [`SdCommandDirective`](./sd-command-directive.md)로 독립 디렉티브로 제공된다.
