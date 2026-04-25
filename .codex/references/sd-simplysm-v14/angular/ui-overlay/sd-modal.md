# `SdModal`

> **읽어야 하는 상황**: 모달 래퍼 컴포넌트의 내부 구조를 이해할 때. 모달 생성은 [`SdModalProvider`](../providers$sd-modal-provider.md) 참조.

모달 래퍼 컴포넌트. `SdModalProvider.showAsync()`에 의해 프로그래밍 방식으로 생성된다. 직접 템플릿에 배치하지 않는다.

```typescript
@Component({ selector: "sd-modal", ... })
export class SdModal
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `open` | model | `boolean` | 열림 상태 (기본값: `false`) |
| `key` | input | `string \| undefined` | 설정 저장 키 (크기/위치 저장) |
| `title` | input | `string` | 모달 제목 (기본값: `""`) |
| `hideHeader` | input | `boolean` | 헤더 숨김 (기본값: `false`) |
| `hideCloseButton` | input | `boolean` | 닫기 버튼 숨김 (기본값: `false`) |
| `headerStyle` | input | `string \| undefined` | 헤더 인라인 스타일 |
| `useCloseByBackdrop` | input | `boolean` | 배경 클릭으로 닫기 (기본값: `true`) |
| `useCloseByEscapeKey` | input | `boolean` | ESC 키로 닫기 (기본값: `true`) |
| `float` | input | `boolean` | 플로팅 모달 (backdrop 없음) (기본값: `false`) |
| `fill` | input | `boolean` | 전체 화면 채우기 (기본값: `false`) |
| `resizable` | input | `boolean` | 크기 조절 가능 (기본값: `false`) |
| `movable` | input | `boolean` | 이동 가능 (기본값: `false`) |
| `position` | input | `"bottom-right" \| "top-right" \| undefined` | 초기 위치 |
| `minHeightPx` | input | `number \| undefined` | 최소 높이 |
| `minWidthPx` | input | `number \| undefined` | 최소 너비 |
| `heightPx` | input | `number \| undefined` | 초기 높이 |
| `widthPx` | input | `number \| undefined` | 초기 너비 |
| `actionTplRef` | input | `TemplateRef<any> \| undefined` | 헤더 액션 영역 템플릿 |
| `closeRequest` | output | `void` | 닫기 요청 (배경 클릭, ESC, X 버튼) |

모달 컴포넌트를 직접 사용하는 대신 [`SdModalProvider`](../providers$sd-modal-provider.md)를 사용한다.
