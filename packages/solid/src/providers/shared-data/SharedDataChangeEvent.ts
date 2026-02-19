import { defineEvent } from "@simplysm/service-common";

/**
 * SharedData 변경 이벤트 정의
 *
 * @remarks
 * 서버-클라이언트 간 공유 데이터 변경을 알리는 이벤트.
 * - 이벤트 정보: `{ name: string; filter: unknown }` — 데이터 이름과 필터
 * - 이벤트 데이터: `(string | number)[] | undefined` — 변경된 항목의 key 배열 (undefined면 전체 갱신)
 */
export const SharedDataChangeEvent = defineEvent<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>("SharedDataChangeEvent");
