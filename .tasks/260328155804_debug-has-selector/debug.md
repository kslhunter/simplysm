# 디버그: Chrome 61에서 :has() 미지원으로 matches() 에러 발생

## 에러 증상

- **에러 메시지:** `Failed to execute 'matches' on 'Element': ':focus, :has(*:focus)' is not a valid selector.`
- **위치:** `packages/sd-angular/src/ui/overlay/dropdown/sd-dropdown.control.ts:84`
- **재현:** Chrome 61 (PM500 PDA WebView)에서 `sd-select` 항목 선택 시 발생

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | 증거1: "not a valid selector" 에러 | 증거2: `:has()` Chrome 105+ 지원 | 증거3: `matches()` Chrome 34+ 지원 |
|----|---|---|---|
| H1: `:has()` CSS 의사 클래스 미지원 | C | C | C |
| H2: `matches()` 메서드 자체 미지원 | I → 폐기 | N | N |

### 결과: 확정 — H1

Chrome 61에서 `:has()` CSS 의사 클래스를 지원하지 않기 때문에, `popupEl.matches(":focus, :has(*:focus)")`가 invalid selector 에러를 발생시킴.

## 해결 방안

### 방안 A: `document.activeElement` + `contains()` 사용

- **설명:**
  ```typescript
  if (popupEl === document.activeElement || popupEl.contains(document.activeElement)) {
    contentEl.focus();
  }
  ```
- **장점:** `contains()`는 Chrome 1+부터 지원. 가장 단순하고 의미적으로 동일
- **반론:** `document.activeElement`가 `null`일 수 있으나, `contains(null)`은 `false`를 반환하므로 안전
- **점수:** 안정성 9, 호환성 10, 의미 정확성 10 → **평균 9.7/10**

### 방안 B: 이슈 제안 — `querySelector("*:focus")` 사용

- **설명:**
  ```typescript
  if (popupEl === document.activeElement || popupEl.querySelector("*:focus") != null) {
    contentEl.focus();
  }
  ```
- **장점:** 이슈 작성자 제안 방식. 동작 보장
- **반론:** `querySelector`는 DOM 트리를 순회하므로 `contains(document.activeElement)`보다 비효율적
- **점수:** 안정성 9, 호환성 10, 의미 정확성 9 → **평균 9.3/10**

### 방안 C: 수행 안 함

- **장점:** 코드 변경 없음
- **반론:** Chrome 61 환경에서 드롭다운 선택 시 계속 에러 발생. PDA 기기 업데이트 불가
- **점수:** 안정성 3, 호환성 3, 의미 정확성 3 → **평균 3.0/10**

## 선택 결과

**방안 A 변경 → `:focus-within`** (평균 9.7/10)

`:focus-within`은 Chrome 60+부터 지원되며, 원래 `:focus, :has(*:focus)`와 의미적으로 동일. 셀렉터 문자열만 교체하므로 변경 범위 최소.
