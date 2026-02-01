# Solid 패키지 규칙

## 브라우저 호환성
- Chrome 84+ 지원 필수
- TypeScript는 esbuild로 Chrome 84 타겟으로 트랜스파일됨
  - Optional chaining (`?.`), Nullish coalescing (`??`) 등 최신 JS 문법 사용 가능
- **CSS는 트랜스파일되지 않음** - Chrome 84 미지원 CSS 기능 사용 금지
  - Flexbox gap: 사용 가능 (Chrome 84+)
  - `aspect-ratio`, `inset`, `:is()`, `:where()`등: 사용 금지 (Chrome 88+)
