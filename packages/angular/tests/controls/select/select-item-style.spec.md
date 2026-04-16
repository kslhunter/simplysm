# sd-select-item 스타일 복원 — 수동 검증

## 전제 조건

- sd-select를 사용하는 페이지가 브라우저에서 열려 있음
- 드롭다운에 최소 3개 이상의 sd-select-item이 있음 (일반/선택됨/비활성)

## 수행 절차

### 1. 기본 배경색

1. sd-select의 드롭다운을 열어 항목 목록을 표시
2. DevTools에서 sd-select-item > ._content의 computed background 확인

### 기대 결과

- 배경이 var(--control-color) 값 (라이트 모드: 흰색)

### 2. 다크모드 배경 호환

1. 테마 셀렉터로 다크모드 활성화
2. sd-select 드롭다운을 열어 항목 배경 확인

### 기대 결과

- --control-color가 다크 테마 값으로 변경되어 배경이 어두운 색으로 표시

### 3. hover transition

1. sd-select 드롭다운을 열고 항목 위에 마우스를 천천히 올림
2. 마우스를 항목에서 천천히 내림

### 기대 결과

- 마우스 진입 시 배경이 부드럽게(0.1s) 어두워짐
- 마우스 이탈 시 배경이 부드럽게(0.1s) 원래로 복귀
- 갑작스러운 전환이 아닌 부드러운 애니메이션

### 4. focus transition

1. sd-select 드롭다운을 열고 Tab 키로 항목에 포커스 이동

### 기대 결과

- 포커스된 항목 배경이 부드럽게 변경됨

### 5. selected 텍스트 색상

1. sd-select에서 항목을 선택
2. 드롭다운을 다시 열어 선택된 항목 확인

### 기대 결과

- 선택된 항목의 텍스트가 primary 색상(파란색 계열)으로 표시
- font-weight가 bold

### 6. disabled 배경색

1. disabled된 sd-select-item이 있는 드롭다운 열기

### 기대 결과

- 비활성 항목 배경이 회색(--theme-gray-default)
- 반투명(opacity 0.3)
- 클릭 불가(pointer-events: none)
