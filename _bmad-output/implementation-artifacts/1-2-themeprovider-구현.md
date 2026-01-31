# Story 1.2: ThemeProvider 구현

Status: done

---

## Story

As a 개발자,
I want ThemeProvider로 다크/라이트 테마를 설정할 수 있기를,
So that 앱 전체에 일관된 테마가 적용된다.

## Acceptance Criteria

1. **AC1**: ConfigProvider가 적용된 앱에서 ThemeProvider로 감싸고 테마를 설정할 수 있다
2. **AC2**: theme="dark" 또는 "light" 설정 시 themeVars CSS 변수가 적용된다
3. **AC3**: 테마 전환 시 모든 컴포넌트 스타일이 즉시 변경된다
4. **AC4**: 테마 설정이 localStorage에 저장되어 새로고침 후에도 유지된다
5. **AC5**: @simplysm/solid에서 ThemeProvider와 useTheme이 export된다

## Tasks / Subtasks

- [x] Task 1: 기존 ThemeProvider 구현 확인 (AC: #1, #2, #3, #4, #5)
  - [x] Subtask 1.1: `packages/solid/src/contexts/ThemeContext.tsx` 파일 존재 확인
  - [x] Subtask 1.2: ThemeProvider, useTheme 구현 확인
  - [x] Subtask 1.3: lightTheme, darkTheme CSS 클래스 적용 확인
  - [x] Subtask 1.4: localStorage 연동 확인
  - [x] Subtask 1.5: index.ts에서 export 확인

## Dev Notes

### 중요 발견: ThemeProvider는 이미 구현되어 있음

기존 코드베이스 분석 결과, **ThemeProvider가 이미 완전히 구현되어 있습니다.**

**현재 구현 위치:** `packages/solid/src/contexts/ThemeContext.tsx`

**현재 구현 상태:**
```typescript
// ThemeContext.tsx - 이미 구현됨
import { createContext, createEffect, type ParentComponent, useContext } from "solid-js";
import { isServer } from "solid-js/web";
import { darkTheme, lightTheme } from "../styles/variables/theme.css";
import { useLocalStorage } from "../hooks/useLocalStorage";

const themeClassMap = { light: lightTheme, dark: darkTheme } as const;
type ThemeKey = keyof typeof themeClassMap;

const ThemeContext = createContext<{
  theme: () => ThemeKey;
  setTheme: (t: ThemeKey) => void;
}>();

export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setTheme] = useLocalStorage<ThemeKey>("theme", "light");

  createEffect(() => {
    if (isServer) return;
    const el = document.documentElement;
    el.classList.remove(lightTheme, darkTheme);
    el.classList.add(themeClassMap[theme()]);
  });

  return <ThemeContext.Provider value={{ theme, setTheme }}>{props.children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "[useTheme] ThemeProvider 내부에서 사용해야 합니다.\n" +
      "ThemeProvider는 ConfigProvider 내부에 배치되어야 합니다.\n" +
      "예: <ConfigProvider><ThemeProvider>...</ThemeProvider></ConfigProvider>",
    );
  }
  return ctx;
}
```

**Export 확인:** `packages/solid/src/index.ts`에서 이미 export됨
```typescript
export * from "./contexts/ThemeContext";
```

### 테마 CSS 클래스 구현

**위치:** `packages/solid/src/styles/variables/theme.css.ts`

```typescript
// lightTheme와 themeVars 정의
export const [lightTheme, themeVars] = createTheme({
  control: { primary, secondary, success, warning, danger, info, gray, slate },
  surface: { base, elevated, muted, inverted },
  text: { base, muted, inverted },
  border: { base, muted },
});

// darkTheme 정의 (themeVars 재사용)
export const darkTheme = createTheme(themeVars, { ... });
```

### 결론

이 스토리는 **이미 완료된 상태**입니다. 기존 구현이 모든 Acceptance Criteria를 충족합니다:

| AC | 상태 | 근거 |
|----|------|------|
| AC1 | ✅ 충족 | ThemeProvider는 ConfigProvider 내부에서 동작하도록 설계됨 |
| AC2 | ✅ 충족 | createEffect로 html 요소에 lightTheme/darkTheme 클래스 적용 |
| AC3 | ✅ 충족 | themeVars CSS 변수 기반으로 즉시 전환됨 |
| AC4 | ✅ 충족 | useLocalStorage 훅으로 "theme" 키에 저장 |
| AC5 | ✅ 충족 | index.ts에서 export됨 |

### 테마 시스템 아키텍처

```
ThemeProvider
    │
    ├── useLocalStorage("theme", "light")  # 상태 저장
    │
    └── createEffect()                      # 테마 적용
         │
         └── document.documentElement
              ├── classList.remove(lightTheme, darkTheme)
              └── classList.add(themeClassMap[theme()])
```

### themeVars 토큰 구조

| 카테고리 | 토큰 | 용도 |
|----------|------|------|
| control | primary, secondary, success, warning, danger, info, gray, slate | 컨트롤 색상 |
| surface | base, elevated, muted, inverted | 배경 색상 |
| text | base, muted, inverted | 텍스트 색상 |
| border | base, muted | 테두리 색상 |

### Previous Story Intelligence

**Story 1.1 (ConfigProvider 구현)에서의 학습:**
- 기존 구현이 완전하여 추가 작업 불필요
- contexts/ 폴더에 Context 패턴 일관되게 적용됨
- 한국어 에러 메시지 패턴 확립됨

### Project Structure Notes

**기존 파일 구조:**
```
packages/solid/src/
├── contexts/
│   ├── ConfigContext.tsx  # ConfigProvider, useConfig (Story 1.1)
│   └── ThemeContext.tsx   # ThemeProvider, useTheme (Story 1.2)
├── styles/
│   └── variables/
│       ├── theme.css.ts   # lightTheme, darkTheme, themeVars
│       └── colors.css.ts  # colorVars 정의
├── hooks/
│   └── useLocalStorage.ts # ThemeProvider에서 사용
└── index.ts               # 모든 export 통합
```

### References

- [Source: packages/solid/src/contexts/ThemeContext.tsx] - 전체 구현
- [Source: packages/solid/src/styles/variables/theme.css.ts] - 테마 CSS 정의
- [Source: packages/solid/src/index.ts:31] - export 정의
- [Source: _bmad-output/planning-artifacts/architecture.md#Styling-Architecture] - 스타일 아키텍처

## Dev Agent Record

### Agent Model Used

_검증 완료 - 구현 불필요_

### Completion Notes List

1. **구현 불필요**: ThemeProvider는 이미 `packages/solid/src/contexts/ThemeContext.tsx`에 완전히 구현되어 있음
2. **모든 AC 충족**: 5개 Acceptance Criteria 모두 기존 구현으로 충족됨
3. **테마 시스템 완비**: lightTheme/darkTheme CSS 클래스 + themeVars CSS 변수 완성
4. **localStorage 연동 완료**: useLocalStorage 훅으로 테마 설정 저장
5. **권장 조치**: 이 스토리를 `done`으로 마킹하고 다음 스토리(1-3-스타일-시스템-통합-검증)로 진행

### File List

- `packages/solid/src/contexts/ThemeContext.tsx` (기존 - 변경 없음)
- `packages/solid/src/styles/variables/theme.css.ts` (기존 - 변경 없음)
- `packages/solid/src/hooks/useLocalStorage.ts` (기존 - 변경 없음)
- `packages/solid/src/index.ts` (기존 - 변경 없음)
