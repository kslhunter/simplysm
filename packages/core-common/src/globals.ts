/**
 * 개발 모드 여부
 *
 * 빌드 시점에 치환됨:
 * - 라이브러리 빌드: 치환하지 않음 (그대로 유지)
 * - client/server 빌드: `define: { '__DEV__': 'true/false' }`로 치환
 */
export {};

declare global {
  const __DEV__: boolean;
}
