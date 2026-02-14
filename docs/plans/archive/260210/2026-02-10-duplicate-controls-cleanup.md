# 중복 컨트롤 정리

raw HTML 요소를 기존 컴포넌트(`Button`, `TextField`, `Icon`)로 교체하는 작업.

## 수정 대상 (15건)

### 데모 페이지 raw `<button>` → `Button` (13건)

모든 케이스가 동일한 인라인 스타일 패턴을 반복:

```tsx
// Before
<button class="rounded bg-primary-500 px-3 py-1 text-sm text-white hover:bg-primary-600" ...>

// After
<Button theme="primary" variant="solid" size="sm" ...>
```

| 파일                                                      | 행  | 현재                  | 변경                                               |
| --------------------------------------------------------- | --- | --------------------- | -------------------------------------------------- |
| `solid-demo/src/pages/form-control/FieldPage.tsx`         | 345 | "값 변경" primary     | `Button theme="primary" variant="solid" size="sm"` |
| `solid-demo/src/pages/form-control/FieldPage.tsx`         | 367 | "+100" primary        | `Button theme="primary" variant="solid" size="sm"` |
| `solid-demo/src/pages/form-control/FieldPage.tsx`         | 373 | "-100" primary        | `Button theme="primary" variant="solid" size="sm"` |
| `solid-demo/src/pages/form-control/FieldPage.tsx`         | 379 | "초기화" base         | `Button variant="solid" size="sm"`                 |
| `solid-demo/src/pages/form-control/FieldPage.tsx`         | 402 | "값 변경" primary     | `Button theme="primary" variant="solid" size="sm"` |
| `solid-demo/src/pages/form-control/CheckBoxRadioPage.tsx` | 164 | "토글" primary        | `Button theme="primary" variant="solid" size="sm"` |
| `solid-demo/src/pages/form-control/SelectPage.tsx`        | 215 | "포도 선택" primary   | `Button theme="primary" variant="solid" size="sm"` |
| `solid-demo/src/pages/form-control/SelectPage.tsx`        | 247 | "사과+바나나" primary | `Button theme="primary" variant="solid" size="sm"` |
| `solid-demo/src/pages/form-control/SelectPage.tsx`        | 253 | "초기화" base         | `Button variant="solid" size="sm"`                 |
| `solid-demo/src/pages/layout/FormTablePage.tsx`           | 160 | "값 채우기" primary   | `Button theme="primary" variant="solid" size="sm"` |
| `solid-demo/src/pages/layout/FormTablePage.tsx`           | 169 | "초기화" base         | `Button variant="solid" size="sm"`                 |
| `solid-demo/src/pages/layout/FormGroupPage.tsx`           | 171 | "값 채우기" primary   | `Button theme="primary" variant="solid" size="sm"` |
| `solid-demo/src/pages/layout/FormGroupPage.tsx`           | 180 | "초기화" base         | `Button variant="solid" size="sm"`                 |

### ServiceClientPage raw `<input>` → `TextField` (1건)

| 파일                                                 | 행  | 현재                  | 변경        |
| ---------------------------------------------------- | --- | --------------------- | ----------- |
| `solid-demo/src/pages/service/ServiceClientPage.tsx` | 110 | `<input type="text">` | `TextField` |

### NotificationBanner raw `<svg>` → `Icon` (1건)

| 파일                                                                | 행  | 현재             | 변경                  |
| ------------------------------------------------------------------- | --- | ---------------- | --------------------- |
| `solid/src/components/feedback/notification/NotificationBanner.tsx` | 76  | raw SVG X 아이콘 | `<Icon icon={IconX}>` |

## 수정 제외 (판정: 부적합 또는 경계 사례)

| 파일                                  | 이유                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| `EditorToolbar.tsx` (19개 button)     | 토글/active 상태 필요, Button과 요구사항 불일치              |
| `Modal.tsx` (닫기 button)             | Button 기본 스타일 override 과도                             |
| `NotificationBanner.tsx` (2개 button) | 컬러 배경 위 white/transparent 스타일, Button theme과 불일치 |
| `NotificationBell.tsx` (2개 button)   | badge 포지셔닝, 텍스트링크 스타일                            |
| `Sheet.tsx` (3개 button)              | 테이블 내부 소형 유틸리티 버튼, Button과 충돌                |

## 주의사항

- `Button`의 import가 없는 파일에는 import 추가 필요
- base 테마 버튼: `bg-base-500` 스타일은 `Button variant="solid"` (theme 기본값이 base)로 대체
- `TextField`의 `value`/`onValueChange` prop 시그니처 확인 필요
