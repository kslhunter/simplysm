import type { ZipCache } from "./zip-cache";
import type { IStyleModel } from "../models/i-style-model";

/**
 * `xl/styles` 파트를 가져오거나 없으면 생성, 등록한다 (포맷별 처리는 ZipCache 에 위임).
 * `ExcelCell.setStyle` 과 `ExcelWorkbook.setDefaultStyle` 양쪽이 공유한다.
 */
export async function getOrCreateStyleData(zipCache: ZipCache): Promise<IStyleModel> {
  return zipCache.ensureStyles();
}
