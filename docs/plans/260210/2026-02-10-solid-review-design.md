# packages/solid 코드 리뷰 이슈 해결 설계

## 개요

`packages/solid` 코드 리뷰에서 발견된 10건의 유효 이슈를 해결하기 위한 설계 문서.

---

## 1. 버그/안정성 (CR-1 ~ CR-4)

### CR-1. SharedData loadData 동시 호출 시 데이터 역전 방지

- **파일**: `src/contexts/shared-data/SharedDataProvider.tsx`
- **방법**: name별 version counter 도입
  - `loadData` 호출 시 version 증가
  - fetch 완료 후 현재 version과 비교하여 오래된 응답 무시
- **변경 범위**: 1개 파일

### CR-2. SharedData fetch 에러 알림

- **파일**: `src/contexts/shared-data/SharedDataProvider.tsx`
- **방법**: `loadData`에 try/catch 추가
  - catch에서 `useNotification`을 통해 danger 알림 표시
  - `setLoadingCount` 감소는 finally에서 유지
- **변경 범위**: 1개 파일

### CR-3. Dropdown resize 시 닫기

- **파일**: `src/components/disclosure/Dropdown.tsx`
- **방법**: `mounted()` 상태일 때 `window resize` 이벤트 리스너 등록
  - resize 발생 시 드롭다운 닫기 (기존 scroll 처리와 동일 방식)
  - `onCleanup`에서 리스너 해제
- **변경 범위**: 1개 파일

### CR-4. ServiceClient onCleanup 개선

- **파일**: `src/contexts/ServiceClientProvider.tsx`
- **방법**: `onCleanup` 내 async 대신 동기적 close 호출, 또는 `beforeunload` 이벤트에서 처리
- **변경 범위**: 1개 파일

---

## 2. 코드 중복 제거 (S-1, S-2)

### S-1. 애니메이션 `createMountTransition` 훅 추출

- **신규 파일**: `src/utils/createMountTransition.ts`
- **시그니처**: `createMountTransition(open: () => boolean): { mounted: () => boolean, animating: () => boolean }`
- **내부**: `mounted` + `animating` 이중 signal, double rAF, `onCleanup`
- **적용 대상**: `Dropdown.tsx`, `Dialog.tsx`, `LoadingContainer.tsx`
- `index.ts`에서 export
- **변경 범위**: 1개 신규 + 3개 수정 + `index.ts`

### S-2. IME `createIMEHandler` 훅 추출

- **신규 파일**: `src/utils/createIMEHandler.ts`
- **시그니처**: `createIMEHandler(setValue: (v: string) => void): { composingValue, displayValue, handleInput, handleCompositionStart, handleCompositionEnd, cleanup }`
- **적용 대상**: `TextInput.tsx`, `Textarea.tsx`
- `index.ts`에서 export
- **변경 범위**: 1개 신규 + 2개 수정 + `index.ts`

### S-3. Provider 중첩 단순화 — 스킵

- `createAppStructure`가 이미 중첩을 추상화하고 있어 실질적 이점 적음

---

## 3. DX/일관성 (DX-1 ~ DX-4)

### DX-1. 에러 메시지 한국어 통일

영어로 된 4개 Context 에러 메시지를 한국어로 변경:

| 파일                | 현재 (영어)                                               | 변경 (한국어)                                                        |
| ------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| `DialogContext.ts`  | "useDialog must be used within a DialogProvider"          | "useDialog는 DialogProvider 내부에서만 사용할 수 있습니다"           |
| `SidebarContext.ts` | "useSidebarContext must be used within SidebarContainer"  | "useSidebarContext는 SidebarContainer 내부에서만 사용할 수 있습니다" |
| `KanbanContext.ts`  | "useKanbanContext must be used within Kanban" 등          | 한국어로 변경                                                        |
| `SelectContext.ts`  | "useSelectContext must be used within a Select component" | "useSelectContext는 Select 컴포넌트 내부에서만 사용할 수 있습니다"   |

- **변경 범위**: 4개 파일

### DX-2. Provider 에러 메시지에 의존성 정보 추가

의존성이 있는 Provider의 에러 메시지에 필요한 상위 Provider 정보 포함:

| Context                | 의존성 정보                                    |
| ---------------------- | ---------------------------------------------- |
| `ThemeContext`         | InitializeProvider 아래                        |
| `ServiceClientContext` | InitializeProvider와 NotificationProvider 아래 |
| `SharedDataContext`    | ServiceClientProvider 아래                     |

- **변경 범위**: 3~4개 파일

### DX-3. `createPropSignal` → `createControllableSignal` 리네이밍

- `src/utils/createPropSignal.ts` → `src/utils/createControllableSignal.ts` 파일명 변경
- 함수명, export명 변경
- 27개 이상 사용처에서 import/호출 변경
- `index.ts` export 변경
- **변경 범위**: 1개 유틸 + 27개 이상 컴포넌트 + `index.ts`

### DX-4. styles export 통일 (전부 export)

- `index.ts`에 누락된 `.styles.ts` 파일 추가 export
- **변경 범위**: `index.ts` 1개 파일

---

## 실행 순서 권장

1. DX-3 (리네이밍) — 변경 범위가 넓어 먼저 처리하여 충돌 최소화
2. S-1 + S-2 (훅 추출) — 신규 파일 생성 후 기존 파일 수정
3. CR-1 + CR-2 (SharedData) — 같은 파일 수정
4. CR-3 (Dropdown resize)
5. CR-4 (ServiceClient onCleanup)
6. DX-1 + DX-2 (에러 메시지) — 단순 문자열 변경
7. DX-4 (styles export) — index.ts만 수정
