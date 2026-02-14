# Progress 컴포넌트 설계

> 작성일: 2026-02-10

## 개요

프로그레스 바 컴포넌트. 0~1 범위의 값을 시각적으로 표시한다.

## Props

```typescript
interface ProgressProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: number; // 0~1 범위의 진행률 (필수)
  theme?: SemanticTheme; // 기본값 "primary"
  size?: "sm" | "lg"; // 패딩 변형
  inset?: boolean; // 테두리/둥근모서리 제거
  children?: JSX.Element; // 없으면 백분율 텍스트 표시
}
```

## 렌더링 구조

```html
<div class="relative block w-full overflow-hidden ...">  <!-- 루트: 배경 -->
  <div class="relative z-[2] text-right ...">            <!-- 콘텐츠 -->
    {children ?? "75.00%"}
  </div>
  <div class="absolute top-0 left-0 h-full z-[1] ..."   <!-- 바: 왼쪽부터 채움 -->
       style={{ width: `${value * 100}%` }}
  />
</div>
```

- 바가 왼쪽에서 시작하여 `value`만큼 오른쪽으로 채워짐
- 텍스트는 바 위에 겹쳐서 표시 (우측 정렬)

## 스타일 변형

### theme

`themeTokens`에서 `solid` 변형 사용 (바 배경색):

- 예: `primary` → `bg-primary-500`, `danger` → `bg-danger-500`

### size

콘텐츠 영역 패딩으로 구분:

- 기본: `py-1 px-2`
- `sm`: `py-0.5 px-2`
- `lg`: `py-2 px-3`

### inset

`true`일 때 `rounded-none border-0` + 배경을 투명하게 변경

### 루트 기본 스타일

`rounded bg-base-200 dark:bg-base-700 border border-base-200 dark:border-base-700`

## 파일 위치

- 컴포넌트: `packages/solid/src/components/display/Progress.tsx`
- export: `packages/solid/src/index.ts`에 추가
- 데모: `packages/solid-demo/src/app/views/ProgressDemoPage.tsx`
