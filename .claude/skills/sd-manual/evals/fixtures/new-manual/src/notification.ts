export type Severity = "info" | "success" | "warning" | "danger";

export interface ShowOptions {
  /** 색상 강조 단계. 기본값 "info". */
  severity?: Severity;
  /** 자동 사라짐 시간(ms). 기본값 3000. */
  durationMs?: number;
}

/**
 * 화면 우상단에 토스트 알림을 띄운다.
 * durationMs 경과 후 자동으로 사라진다.
 */
export function show(message: string, opts?: ShowOptions): void {
  const severity = opts?.severity ?? "info";
  const durationMs = opts?.durationMs ?? 3000;
  renderToast(message, severity, durationMs);
}

function renderToast(message: string, severity: Severity, durationMs: number): void {
  // 실제 DOM 렌더링 (생략)
  void message;
  void severity;
  void durationMs;
}
