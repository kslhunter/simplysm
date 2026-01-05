/**
 * 수학 유틸리티
 */
export class MathUtils {
  /**
   * 지정된 범위 내의 랜덤 정수 반환
   * @param min 최소값 (포함)
   * @param max 최대값 (미포함)
   */
  static getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min);
  }
}
