# Barcode 컴포넌트 설계

> 작성일: 2026-02-10
> 마이그레이션 항목: #7 Barcode (바코드 렌더링)

## 개요

`bwip-js` 라이브러리를 사용하여 1D/2D 바코드를 SVG로 렌더링하는 SolidJS 컴포넌트.
기존 Angular `sd-barcode` 컴포넌트와 동일한 기능을 제공한다.

## API

```tsx
<Barcode type="qrcode" value="https://example.com" />
<Barcode type="code128" value="123456789" />
```

### Props

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `type` | `BarcodeType` | O | 바코드 타입 (bwip-js bcid) |
| `value` | `string` | X | 인코딩할 데이터 |
| `class` | `string` | X | 커스텀 CSS 클래스 |
| 기타 | `JSX.HTMLAttributes<HTMLDivElement>` | X | 표준 div 속성 |

### 동작

- `type`/`value` 변경 시 `createEffect`로 `bwip-js.toSVG()` 호출
- SVG를 컨테이너 div의 `innerHTML`에 삽입
- `value`가 없거나 빈 문자열이면 아무것도 렌더링하지 않음

## 파일 구조

- `packages/solid/src/components/display/Barcode.tsx`
- `index.ts`에 export 추가 (display 섹션)

## 의존성

- `bwip-js` — `packages/solid/package.json`에 추가

## 타입

`BarcodeType`은 기존 Angular 컴포넌트의 `TBarcodeType`과 동일한 목록을 사용한다.
