/**
 * 개발 모드 활성화 여부
 *
 * 빌드 시점에 치환됨:
 * - 라이브러리 빌드: 치환되지 않음 (그대로 유지)
 * - 클라이언트/서버 빌드: `define: { '__DEV__': 'true/false' }`로 치환
 */
export {};

declare global {
  const __DEV__: boolean;
}
