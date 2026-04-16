# sd-shared-data-select "미지정" 옵션 스타일 — 수동 검증

## 전제 조건

- sd-shared-data-select를 사용하는 페이지가 브라우저에서 열려 있음
- required가 false이고 selectMode가 "single"인 상태 (기본값)
- 드롭다운을 열어 "미지정" 옵션이 표시됨

## 수행 절차

### 1. 기본 스타일

1. sd-shared-data-select의 드롭다운을 열어 "미지정" 옵션 표시
2. DevTools에서 `._sd-shared-data-select-undefined` div의 computed style 확인

### 기대 결과

- padding이 var(--gap-sm) var(--gap-default) 값과 일치
- cursor가 pointer
- background가 var(--control-color) 값 (라이트 모드: 흰색)

### 2. hover 효과

1. "미지정" 옵션 위에 마우스를 천천히 올림
2. 마우스를 "미지정" 옵션에서 천천히 내림

### 기대 결과

- 마우스 진입 시 배경이 부드럽게(0.1s) 어두워짐 (var(--trans-lighter))
- 마우스 이탈 시 배경이 부드럽게(0.1s) 원래로 복귀
- sd-select-item과 동일한 전환 속도 및 효과

### 3. focus 효과

1. 드롭다운 열린 상태에서 Tab 키로 "미지정" 옵션에 포커스 이동

### 기대 결과

- 포커스된 "미지정" 옵션의 배경이 변경됨 (var(--trans-lighter))
- outline이 표시되지 않음
- sd-select-item에 포커스했을 때와 동일한 시각적 효과

### 4. 다른 항목과의 시각적 일관성

1. "미지정" 옵션과 바로 아래 sd-select-item 항목을 나란히 비교

### 기대 결과

- padding(좌우, 상하)이 동일
- hover/focus 시 배경색 전환이 동일
- "미지정" 옵션이 다른 항목과 자연스럽게 어우러짐
