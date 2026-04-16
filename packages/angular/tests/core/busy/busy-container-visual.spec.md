# Feature 3.2 sd-busy-container 시각적 동작 — 수동 검증

## 전제 조건

- sd-busy-container가 포함된 Angular 앱이 실행 중
- 브라우저 DevTools 접근 가능

## 수행 절차

### 1. 페이드 인/아웃 트랜지션

1. busy=false 상태에서 busy=true로 전환
2. **기대 결과:** _screen이 opacity 0→1로 부드럽게 페이드인 (즉시 나타남이 아님)
3. busy=true에서 busy=false로 전환
4. **기대 결과:** _screen이 opacity 1→0으로 부드럽게 페이드아웃

### 2. Spinner 타입

1. type=spinner, busy=false→true 전환
2. **기대 결과:** 상단에서 슬라이드 다운하는 30px 원형 스피너, 6px border, box-shadow 표시
3. message 설정 시 스피너 아래 55px 위치에 bold 흰색(background-color) 텍스트, text-shadow 표시

### 3. Bar 타입

1. type=bar, busy=true
2. **기대 결과:** 화면 상단 4px 높이 바에서 ::before(primary)와 ::after(background)가 scaleX 애니메이션으로 교차

### 4. Cube 타입

1. type=cube, busy=true
2. **기대 결과:** 화면 중앙에 45도 회전된 40x40px 큐브, 4개 면이 perspective(140px) rotateX/Y 3D 플립 애니메이션

### 5. Progress 바

1. busy=true, progressPercent=50
2. **기대 결과:** 화면 최상단에 가로 바, 50% 너비(scaleX(0.5))로 primary 색상 표시
