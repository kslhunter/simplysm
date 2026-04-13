export function getOrmDataEditToastErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (
    message.includes("a parent row: a foreign key constraint") ||
    message.includes("conflicted with the REFERENCE")
  ) {
    return "경고! 연결된 작업에 의한 처리 거부. 후속작업 확인 요망";
  }
  return message;
}
