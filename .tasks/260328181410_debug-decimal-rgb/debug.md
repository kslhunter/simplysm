# 디버그: CSS 변수에 소수점 rgb 값이 포함되어 Chrome 61에서 색상 깨짐

## 에러 증상

- **에러 메시지:** `rgb()` 인자에 소수점이 포함되어 Chrome 61에서 CSS 선언 전체가 invalid 처리
- **위치:** `packages/sd-angular/styles.css` (빌드 결과물), 원본 `packages/sd-angular/scss/commons/_variables.scss:4-6`
- **재현:** Chrome 61 (PM500 PDA WebView)에서 sd-angular CSS 변수를 사용하는 앱 실행 시 색상이 black으로 fallback

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | 증거1: styles.css에 소수점 rgb 존재 | 증거2: to-rgb()가 color.to-space() 사용 | 증거3: color.scale()/mix()도 적용됨 |
|----|-------------------------------------|---------------------------------------|----------------------------------|
| H1: color.to-space()가 소수점 RGB 반환 | C | C | N |
| H2: color.scale()/mix()가 소수점 확산  | C | N | C |

### 결과: 확정 — H1+H2 복합

Sass `color.to-space(oklch, rgb)` 및 `color.scale()`/`color.mix()`가 소수점 RGB 값을 생성하며, CSS 변수 출력 시 정수로 반올림하지 않아 Chrome 61에서 invalid 처리됨.

## 해결 방안

### 방안 A: to-rgb() 함수에서 RGB 채널 반올림

- **설명:** `to-rgb()` 함수 내에서 `math.round()`로 R, G, B 채널 반올림
- **장점:** 변환 소스에서 문제 차단, 변경 범위 1개 함수
- **반론:** `color.scale()`/`color.mix()`가 다시 소수점을 만들 수 있어 파생 색상에 누락 가능
- **점수:** 호환성 8, 정확성 7, 안정성 8 → **평균 7.7/10**

### 방안 B: writeVars mixin에서 색상 출력 시 반올림

- **설명:** CSS 변수 최종 출력 지점인 `writeVars`에서 색상 타입 감지 후 `color.to-space(rgb)` + `color.channel()` + `math.round()`로 정수 RGB 출력
- **장점:** 모든 색상 출력을 한 지점에서 일괄 처리, 누락 없이 완전한 해결
- **반론:** writeVars의 책임 증가, alpha 채널 별도 분기 필요
- **점수:** 호환성 10, 정확성 10, 안정성 9 → **평균 9.7/10**

### 방안 C: 수행 안 함

- **설명:** 코드 변경 없음
- **장점:** 리스크 없음
- **반론:** Chrome 61 지원 불가, PM500 PDA에서 계속 색상 깨짐
- **점수:** 호환성 0, 정확성 0, 안정성 10 → **평균 3.3/10**

## 선택 결과

**방안 B** (평균 9.7/10)

`writeVars` mixin에서 `meta.type-of($value) == color` 분기를 추가하여, `color.to-space(rgb)` + `color.channel()` + `math.round()`로 정수 RGB/RGBA를 출력하도록 수정.

### 수정 파일

- `packages/sd-angular/scss/commons/_mixins.scss`
