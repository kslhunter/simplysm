import type { Bytes } from "@simplysm/core-common";

/**
 * Excel ZIP 파트 1개의 포맷 중립 모델 계약.
 *
 * 구현체(xml/biff)는 자신이 담당하는 파트를 메모리 모델로 들고 있다가, 직렬화 시점에
 * 자기 포맷의 바이트로 변환한다. 직렬화 직전 정규화(OOXML 자식 순서 재배치 등)는 구현 내부에서 수행한다.
 */
export interface IExcelModel {
  /** 이 파트를 자기 포맷의 바이트로 직렬화. */
  serialize(): Bytes;
}
