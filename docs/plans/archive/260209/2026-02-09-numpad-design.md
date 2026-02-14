# Numpad 컴포넌트 설계

> 작성일: 2026-02-09
> 레거시: `.legacy-packages/sd-angular/src/ui/form/input/sd-numpad.control.ts`

## 개요

터치/데스크탑 환경에서 사용 가능한 숫자 입력 패드 컴포넌트. 상단에 NumberField를 내장하여 단독으로 사용 가능하다.

## API

```typescript
export interface NumpadProps {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  placeholder?: string;
  required?: boolean;
  inputDisabled?: boolean;
  useEnterButton?: boolean;
  useMinusButton?: boolean;
  onEnterButtonClick?: () => void;
  size?: "sm" | "lg";
  class?: string;
  style?: JSX.CSSProperties;
}
```

## 레이아웃 (CSS Grid)

```
┌─────────────────────────────────┐
│  NumberField (inset, 우측정렬)   │ ENT │  ← useEnterButton일 때만
├──────────┬──────────┬───────────┤
│    -     │    C     │    BS     │  ← useMinusButton일 때만 - 표시
├──────────┼──────────┼───────────┤
│    7     │    8     │    9     │
├──────────┼──────────┼───────────┤
│    4     │    5     │    6     │
├──────────┼──────────┼───────────┤
│    1     │    2     │    3     │
├──────────┴──────────┼───────────┤
│         0          │     .     │
└─────────────────────┴───────────┘
```

- `grid grid-cols-3` 기반
- `gap-0.5`으로 버튼 간격
- NumberField 행: `useEnterButton`이면 colspan 2 + ENT, 아니면 colspan 3
- C/BS 행: `useMinusButton`이면 3열, 아니면 C가 colspan 2
- 0 버튼: colspan 2

## 내부 상태 관리

```
[버튼 클릭] → inputStr 업데이트 → parseFloat → value → onValueChange
[외부 value] → inputStr 반영 (편집 중이 아닐 때)
```

- `createPropSignal`: value (number | undefined) 관리
- `inputStr` 시그널: 텍스트 표현 관리
- NumberField `inset` 모드 내장, `inputDisabled` → `readonly`

## 버튼 동작

| 버튼 | 동작                               |
| ---- | ---------------------------------- |
| 0-9  | inputStr에 문자 추가               |
| .    | 소수점 추가 (중복 시 무시)         |
| C    | inputStr 초기화, value = undefined |
| BS   | inputStr 마지막 문자 제거          |
| -    | 부호 토글                          |
| ENT  | onEnterButtonClick 콜백 호출       |

## 스타일

- 버튼: `Button` 컴포넌트 재사용, `inset` 모드
- C 버튼: `text-danger-500` (eraser 아이콘)
- BS 버튼: `text-warning-500` (arrow-left 아이콘)
- ENT 버튼: `theme="primary"`

## 파일 구조

```
packages/solid/src/components/form-control/numpad/
  Numpad.tsx        # 메인 컴포넌트
```

## 내보내기

```typescript
// index.ts에 추가
export * from "./components/form-control/numpad/Numpad";
```
