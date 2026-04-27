# Setup Functions

> **읽어야 하는 상황**: 컴포넌트에 배경 테마, 리플, reveal 애니메이션, 유효성 표시, model 가드, canDeactivate 등의 부수효과를 설치할 때.

생성자에서 호출하는 설정 함수들. `inject()`, `effect()`, `DestroyRef.onDestroy()`를 사용하여 수명주기를 관리한다.

## `setupBgTheme`

body 배경 테마 색상을 설정한다. 파괴 시 자동 복원.

```typescript
function setupBgTheme(options?: {
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
  lightness?: "lightest" | "lighter";
}): void
```

## `setupRipple`

호스트 요소에 리플 효과를 설정한다. pointer 이벤트 기반.

```typescript
function setupRipple(enableFn?: () => boolean): void
```

## `setupRevealOnShow`

뷰포트 진입 시 reveal 애니메이션을 설정한다. IntersectionObserver 사용.

```typescript
function setupRevealOnShow(optFn?: () => {
  type?: "l2r" | "t2b";
  enabled?: boolean;
}): void
```

## `setupInvalid`

유효성 검증 표시기를 설정한다. 빨간 점 indicator + hidden input으로 구현.

```typescript
function setupInvalid(getInvalidMessage: () => string): void
```

빈 문자열이면 유효, 비어있지 않으면 무효.

## `setupModelHook`

model signal의 `set`/`update`를 가드 함수로 래핑한다. 가드 함수가 `false`를 반환하면 값 변경을 차단.

```typescript
function setupModelHook<T, S extends WritableSignal<T>>(
  model: S,
  canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void
```

## `setupCanDeactivate`

모달 또는 라우트에 canDeactivate 가드를 설정한다.

```typescript
function setupCanDeactivate(fn: () => boolean): void
```

- 모달 내부이면 `SdActivatedModalProvider.canDeactivateFn`에 설정
- 라우트 내부이면 `routeConfig.canDeactivate`에 추가
- control 뷰에서는 라우트도 모달도 아니므로 아무 동작 하지 않음

### 사용 패턴

#### 기본 패턴 (편집 이탈 방지)

```typescript
setupCanDeactivate(() => this._checkIgnoreChanges());
```

`_checkIgnoreChanges()`가 `false`를 반환하면 이탈이 차단된다 (confirm 대화상자로 사용자 확인).

#### 뷰 타입별 분기 패턴

modal 뷰를 추가 지원할 때, 모달에서는 취소 버튼으로 제어하므로 항상 이탈을 허용한다:

```typescript
setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges());
```

- **모달 뷰**: `true` → 항상 이탈 허용 (모달 자체 취소 버튼으로 제어)
- **페이지 뷰**: `_checkIgnoreChanges()` → confirm 결과로 제어
- **control 뷰**: setupCanDeactivate 내부에서 아무 동작 하지 않음 (라우트도 모달도 아님)

