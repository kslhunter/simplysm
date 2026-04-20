import type { QueryBuildResult } from "../types/db";

/**
 * 다중 결과 셋에서 QueryBuildResult 메타데이터에 따라 필요한 결과만 추출한다.
 *
 * - `resultSetIndex`가 없으면 첫 번째 셋 반환
 * - `resultSetStride`가 없으면 `resultSetIndex`번째 셋 단일 반환
 * - `resultSetStride`가 있으면 `resultSetIndex`부터 stride 간격으로 모든 셋을 concat하여 반환
 *   (MySQL 배치 INSERT: `INSERT;SELECT;INSERT;SELECT;...` 형태에서 SELECT 결과만 모을 때 사용)
 */
export function pickResultSets<T>(
  rawResults: T[][],
  buildResult: Pick<QueryBuildResult, "resultSetIndex" | "resultSetStride">,
): T[] {
  const { resultSetIndex, resultSetStride } = buildResult;

  if (resultSetIndex == null) {
    return rawResults[0] ?? [];
  }

  if (resultSetStride == null) {
    return rawResults[resultSetIndex] ?? [];
  }

  const merged: T[] = [];
  for (let j = resultSetIndex; j < rawResults.length; j += resultSetStride) {
    merged.push(...rawResults[j]);
  }
  return merged;
}
