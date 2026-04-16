# Feature 1.2 sd-select-button 스타일 복원 — 수동 검증

## 전제 조건

- sd-shared-data-select 컴포넌트가 포함된 페이지가 브라우저에서 렌더링된 상태
- sd-select에 modal() 또는 editModal()이 설정되어 sd-select-button이 표시되는 상태

## 수행 절차

1. sd-shared-data-select의 검색 버튼(돋보기 아이콘)을 확인한다
2. 버튼의 배경색이 흰색(--control-color)인지 확인한다
3. 아이콘 색상이 primary 테마 색상(파란색 계열)인지 확인한다
4. 버튼에 마우스를 올린다(hover)
5. hover 시 배경이 연한 회색(--theme-gray-lightest)으로 부드럽게 전환되는지 확인한다
6. hover 시 아이콘 색상이 더 진한 primary 색상(--theme-primary-darker)으로 변경되는지 확인한다
7. 마우스를 버튼에서 빼고, 배경이 원래 색상으로 transition으로 복귀하는지 확인한다
8. 편집 버튼(연필 아이콘)도 동일한 스타일이 적용되는지 확인한다

## 기대 결과

- 기본 상태: 흰색 배경 + bold primary 색상 아이콘
- hover 상태: 연한 회색 배경 + 진한 primary 색상 아이콘
- 배경 전환 시 0.1초 linear transition 적용
- v12와 동일한 시각적 피드백
