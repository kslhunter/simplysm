import type {
  ExcelBorderPosition,
  ExcelFont,
  ExcelHorizontalAlign,
  ExcelStyleOptions,
  ExcelVerticalAlign,
} from "../../types";
import { ExcelUtils } from "../../utils/excel-utils";

/**
 * 포맷 중립 셀 스타일. 사용자 표면 `ExcelStyleOptions` 를 내부 표현으로 정규화한 것으로,
 * xml/biff 두 구현의 스타일 모델이 공유한다.
 */
export interface ExcelStyle {
  numFmtId?: string;
  numFmtCode?: string;
  border?: ExcelBorderPosition[];
  background?: string;
  verticalAlign?: ExcelVerticalAlign;
  horizontalAlign?: ExcelHorizontalAlign;
  font?: ExcelFont;
}

/**
 * `ExcelStyleOptions` (사용자 표면) → 내부 `ExcelStyle` 변환.
 * cell.setStyle 과 wb.setDefaultStyle 이 공유한다.
 *
 * - background ARGB 8자리 형식 검증
 * - numberFormatCode 가 numberFormat 보다 우선
 * - font 는 그대로 전달 (구체 검증은 스타일 모델 내부에서 수행)
 */
export function convertExcelStyleOptions(opts: ExcelStyleOptions): ExcelStyle {
  const style: ExcelStyle = {};

  if (opts.background != null) {
    if (!/^[0-9A-F]{8}$/i.test(opts.background)) {
      throw new Error("잘못된 색상 형식입니다. (형식: 00000000: alpha(반전)+rgb)");
    }
    style.background = opts.background;
  }

  if (opts.border != null) {
    style.border = opts.border;
  }

  if (opts.horizontalAlign != null) {
    style.horizontalAlign = opts.horizontalAlign;
  }

  if (opts.verticalAlign != null) {
    style.verticalAlign = opts.verticalAlign;
  }

  if (opts.numberFormatCode != null) {
    style.numFmtCode = opts.numberFormatCode;
  } else if (opts.numberFormat != null) {
    style.numFmtId = ExcelUtils.convertNumFmtNameToId(opts.numberFormat).toString();
  }

  if (opts.font != null) {
    style.font = opts.font;
  }

  return style;
}
