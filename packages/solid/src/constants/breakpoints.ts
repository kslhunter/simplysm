/**
 * 반응형 브레이크포인트 상수
 */
export const BREAKPOINTS = {
  /** 모바일 최대 너비 (px) */
  mobile: 520,
} as const;

/**
 * 모바일 미디어 쿼리 문자열
 */
export const MOBILE_QUERY = `(max-width: ${BREAKPOINTS.mobile}px)`;
