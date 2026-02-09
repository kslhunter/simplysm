# ECharts 래퍼 컴포넌트 설계

> 작성일: 2026-02-10

## 개요

ECharts를 SolidJS 컴포넌트로 감싸는 얇은 래퍼. option 반영 + ResizeObserver + cleanup을 제공한다.

## 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 의존성 방식 | peerDependencies | echarts는 용량이 크고, 앱에서 타입도 직접 사용해야 함 |
| 렌더러 | SVG 고정 | 레거시와 동일, DOM 기반으로 접근성 좋음 |
| loading prop | 지원 | showLoading/hideLoading으로 UX 개선 |
| 크기 지정 | 부모에게 위임 | block w-full h-full 기본, 부모가 크기 결정 |

## 컴포넌트 설계

### Echarts.tsx

**파일**: `packages/solid/src/components/display/Echarts.tsx`

**Props:**
- `option: echarts.EChartsOption` — 필수. 차트 옵션
- `loading?: boolean` — 로딩 인디케이터 표시
- `class?: string` — 추가 CSS 클래스
- 나머지 HTML div 속성은 `...rest`로 전달

**동작:**
1. 마운트 시 `echarts.init(containerRef, null, { renderer: "svg" })` 호출
2. `onCleanup`으로 `chart.dispose()` 등록
3. `createEffect`로 `option` 변경 감지 → `chart.setOption(option)`
4. `createEffect`로 `loading` 변경 감지 → `showLoading()` / `hideLoading()`
5. `createResizeObserver`로 컨테이너 크기 변경 감지 → `chart.resize()`

**기본 스타일:** `block w-full h-full`

## 패키지 변경

- `packages/solid/package.json`: peerDependencies에 `echarts: "^6.0.0"` 추가
- `packages/solid-demo/package.json`: dependencies에 `echarts: "^6.0.0"` 추가
- `packages/solid/src/index.ts`: Echarts export 추가

## 데모 페이지

- `packages/solid-demo/src/app/pages/EchartsPage.tsx` 생성
- bar chart + line chart 예제
- loading 토글 버튼으로 로딩 상태 시연
- 데모 라우트에 등록

## 수정 파일 목록

1. `packages/solid/src/components/display/Echarts.tsx` — 신규
2. `packages/solid/package.json` — peerDependencies 추가
3. `packages/solid/src/index.ts` — export 추가
4. `packages/solid-demo/package.json` — dependencies 추가
5. `packages/solid-demo/src/app/pages/EchartsPage.tsx` — 신규
6. `packages/solid-demo/src/app/pages/index.ts` — 라우트 등록
