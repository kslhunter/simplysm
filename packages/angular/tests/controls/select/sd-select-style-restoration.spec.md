# sd-select 스타일 복원 — 수동 검증

## 전제 조건

- sd-select를 사용하는 프론트엔드 앱이 실행 중
- sd-select에 sd-select-button이 포함된 화면이 있을 것

## 수행 절차

### 1. 기본 모드 시각 확인

1. sd-select 컴포넌트가 있는 화면에 접속한다
2. sd-select가 전체 너비를 차지하는지 확인한다
3. sd-select-button이 border 컨테이너 안에 배치되었는지 확인한다 (button이 border 밖으로 벗어나지 않아야 함)
4. dropdown 화살표 아이콘이 흐리게 표시되는지 확인한다 (opacity 0.3)

### 2. 인터랙션 확인

1. sd-select의 컨트롤 영역에 마우스를 올린다
2. 화살표 아이콘의 opacity가 1로 변경되는지 확인한다
3. sd-select를 클릭하여 포커스를 준다
4. border 색상이 primary 색상(파란색 계열)으로 변경되는지 확인한다

### 3. Disabled 확인

1. disabled 상태의 sd-select를 확인한다
2. 배경이 회색 계열(--theme-gray-lightest)인지 확인한다
3. 텍스트가 흐리게 표시되는지 확인한다
4. 화살표 아이콘이 숨겨져 있는지 확인한다

### 4. Size variant 확인

1. size="sm"인 sd-select의 padding이 기본보다 작은지 확인한다
2. size="lg"인 sd-select의 padding이 기본보다 큰지 확인한다

### 5. Inset 모드 확인

1. inset 모드의 sd-select를 확인한다
2. border가 없는지 확인한다
3. 포커스 시 outline이 표시되는지 확인한다

## 기대 결과

- sd-select의 시각적 표시가 v12와 동일하다
- sd-select-button이 border 컨테이너 안에 올바르게 배치된다
- 모든 인터랙션 상태(hover, focus, disabled)가 올바른 시각적 피드백을 제공한다
