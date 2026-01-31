# Code Review: @simplysm/solid 패키지

**리뷰 일자:** 2026-01-31
**리뷰어:** AI Senior Developer
**패키지 버전:** 13.0.0-beta.0

---

## 리뷰 요약

| 카테고리 | 개수 | 상태 |
|---------|------|------|
| 🔴 HIGH | 5 | 미해결 |
| 🟡 MEDIUM | 4 | 미해결 |
| 🟢 LOW | 5 | 미해결 |
| **총계** | **14** | |

**빌드/테스트 상태:**
- ✅ ESLint: 0 errors, 0 warnings
- ✅ TypeScript: 0 errors, 0 warnings
- ✅ Tests: 111 passed (13 files)

---

## 액션 아이템

### 🔴 HIGH Priority

- [ ] [AI-Review][HIGH] useLocalStorage에서 localStorage 값의 런타임 타입 검증 추가 필요 - 외부 수정 시 예외 처리 [src/hooks/useLocalStorage.ts:34]
- [ ] [AI-Review][HIGH] Dropdown의 scroll 이벤트 리스너에서 클로저 캡처 문제 해결 - scrollableParents를 effect 내부에서 참조하도록 수정 [src/components/overlay/dropdown.tsx:236-250]
- [ ] [AI-Review][HIGH] ripple 디렉티브에서 stopPropagation 사용 재검토 - 옵션으로 분리하거나 제거 고려 [src/directives/ripple.ts:56]
- [ ] [AI-Review][HIGH] buildHref의 HashRouter 감지 로직 개선 - window.location.hash 기반으로 변경 [src/utils/build-href.ts:17]
- [ ] [AI-Review][HIGH] Context 훅들의 에러 처리 개선 - throw 대신 개발 환경 경고 또는 fallback 제공 고려 [src/components/overlay/dropdown-popup.tsx:54-57]

### 🟡 MEDIUM Priority

- [ ] [AI-Review][MEDIUM] ListItem 컴포넌트의 테스트 커버리지 확대 - selectedIcon, icon, controlled 모드, 중첩 리스트 테스트 추가 [tests/components/data/list.spec.tsx]
- [ ] [AI-Review][MEDIUM] 포커스 아웃라인 접근성 개선 - outline: none 대신 focus-visible 활용 [src/styles/global.css.ts:12-14]
- [ ] [AI-Review][MEDIUM] Collapse 컴포넌트 초기 contentHeight 동기화 개선 - 최초 렌더링 시 깜빡임 방지 [src/components/navigator/collapse.tsx:62]
- [ ] [AI-Review][MEDIUM] light 테마에서 primary와 secondary 색상 차별화 [src/styles/variables/theme.css.ts:12-17]

### 🟢 LOW Priority

- [ ] [AI-Review][LOW] atoms.css.ts에서 px/py와 ph/pv 중복 shorthand 정리 [src/styles/atoms.css.ts:56-59]
- [ ] [AI-Review][LOW] MOBILE_BREAKPOINT_PX 값(520px) 선택 이유 문서화 [src/constants.ts:6]
- [ ] [AI-Review][LOW] ListItem의 중첩 리스트 감지 방식 개선 - className 비교 대신 명시적 slot 패턴 검토 [src/components/data/list-item.tsx:83-97]
- [ ] [AI-Review][LOW] Sidebar 토글 로직의 CSS 동작 방식 문서화 추가 [src/components/navigator/sidebar-context.tsx:7-10]
- [ ] [AI-Review][LOW] Button recipe의 defaultVariants 설정 검토 - 기본 theme/size 지정 고려 [src/components/controls/button.css.ts:97]

---

## 상세 분석

### HIGH-1: useLocalStorage 타입 안전성

**현재 코드:**
```typescript
const stored = localStorage.getItem(storageKey) as T | null;
```

**문제점:**
- `as T` 캐스팅은 런타임 검증 없이 외부 데이터를 신뢰
- localStorage가 외부에서 수정되거나 스키마 변경 시 크래시 가능
- 잠재적 보안 취약점 (XSS 공격 벡터)

**권장 해결책:**
```typescript
const stored = localStorage.getItem(storageKey);
const parsed = stored != null ? validateAndParse<T>(stored, defaultValue) : null;
```

---

### HIGH-2: Dropdown 메모리 누수

**현재 코드:**
```typescript
createEffect(() => {
  if (isOpen()) {
    const scrollableParents = getScrollableParents(triggerRef);
    // ... 이벤트 등록
    onCleanup(() => {
      // scrollableParents 참조
    });
  }
});
```

**문제점:**
- 빠른 열기/닫기 시 이전 cleanup이 새 scrollableParents를 참조할 수 있음

**권장 해결책:**
- scrollableParents를 signal로 관리하거나 AbortController 패턴 적용

---

### MEDIUM-2: 접근성 - 포커스 아웃라인

**현재 코드:**
```typescript
globalStyle("*:focus", {
  outline: "none",
});
```

**문제점:**
- 키보드 사용자가 현재 포커스 위치를 시각적으로 확인 불가
- WCAG 2.1 Level AA 기준 위반

**권장 해결책:**
```typescript
globalStyle("*:focus:not(:focus-visible)", {
  outline: "none",
});

globalStyle("*:focus-visible", {
  outline: `2px solid rgb(${themeVars.control.primary.base})`,
  outlineOffset: "2px",
});
```

---

## 긍정적 평가

1. **코드 품질:** ESLint/TypeScript 에러 없음
2. **테스트:** 111개 테스트 모두 통과, 주요 컴포넌트 테스트 존재
3. **문서화:** JSDoc으로 컴포넌트와 훅 문서화 우수
4. **스타일링:** vanilla-extract 패턴 일관성 있게 적용
5. **접근성 기본:** role, aria-* 속성 적절히 사용 (List, ListItem 등)
6. **키보드 지원:** Dropdown, List 등에서 키보드 네비게이션 구현

---

_이 문서는 AI 코드 리뷰어에 의해 자동 생성되었습니다._
