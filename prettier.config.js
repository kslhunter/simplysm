export default {
  printWidth: 120, // 한 줄 최대 길이 (일반적으로 100~120)
  tabWidth: 2, // 탭 너비 (Angular, JS, TS 모두 2칸 권장)
  useTabs: false, // 공백(스페이스) 들여쓰기
  semi: true, // 세미콜론 항상 붙임
  quoteProps: "consistent", // 객체 속성의 따옴표 스타일 통일(필요할 때만)
  trailingComma: "all", // 멀티라인 마지막 쉼표 항상
  bracketSpacing: true, // 객체 중괄호 공백 유지
  bracketSameLine: false, // JSX/HTML에서 '>' 줄바꿈(Angular는 false 권장)
  arrowParens: "always", // 화살표 함수 파라미터 괄호 항상 사용
  endOfLine: "lf", // 줄바꿈 LF로 통일
  htmlWhitespaceSensitivity: "ignore", // HTML 공백 무시(Angular template에 중요)
  embeddedLanguageFormatting: "auto", // 인라인 코드 자동 포매팅
};
