# sd-topbar 초과 콘텐츠 확장 — 수동 검증

## 전제 조건

- 애플리케이션이 개발 모드로 실행 중
- sd-topbar를 포함하는 페이지에 접근 가능

## 수행 절차

1. sd-topbar가 있는 페이지에 접근한다
2. 일반 상태에서 topbar 높이가 3em(약 48px)인지 확인한다
3. DevTools에서 sd-topbar 내부에 높이가 3em을 초과하는 요소를 임시로 추가한다:
   ```html
   <div style="height: 100px; background: red;">Oversized content</div>
   ```
4. topbar가 100px 높이의 콘텐츠에 맞게 확장되는지 확인한다

## 기대 결과

- 일반 상태: topbar 높이 = 3em (--topbar-height)
- 초과 콘텐츠: topbar가 콘텐츠에 맞게 확장되며, 콘텐츠가 잘리지 않는다
