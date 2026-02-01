/**
 * 월 설정 시 연도/월/일 정규화 결과
 */
export interface DtNormalizedMonth {
    year: number;
    month: number;
    day: number;
}
/**
 * 월 설정 시 연도/월/일을 정규화
 * - 월이 1-12 범위를 벗어나면 연도를 조정
 * - 대상 월의 일수보다 현재 일자가 크면 해당 월의 마지막 날로 조정
 *
 * @param year 기준 연도
 * @param month 설정할 월 (1-12 범위 외의 값도 허용)
 * @param day 기준 일자
 * @returns 정규화된 연도, 월, 일
 *
 * @example
 * normalizeMonth(2025, 13, 15) // { year: 2026, month: 1, day: 15 }
 * normalizeMonth(2025, 2, 31)  // { year: 2025, month: 2, day: 28 }
 */
export declare function normalizeMonth(year: number, month: number, day: number): DtNormalizedMonth;
/**
 * 포맷 문자열에 따라 날짜/시간을 문자열로 변환한다
 *
 * @param formatString 포맷 문자열
 * @param args 날짜/시간 구성 요소
 *
 * @remarks
 * C#과 동일한 포맷 문자열을 지원한다:
 *
 * | 포맷 | 설명 | 예시 |
 * |------|------|------|
 * | yyyy | 4자리 연도 | 2024 |
 * | yy | 2자리 연도 | 24 |
 * | MM | 0으로 패딩된 월 | 01~12 |
 * | M | 월 | 1~12 |
 * | ddd | 요일 (한글) | 일, 월, 화, 수, 목, 금, 토 |
 * | dd | 0으로 패딩된 일 | 01~31 |
 * | d | 일 | 1~31 |
 * | tt | 오전/오후 | 오전, 오후 |
 * | hh | 0으로 패딩된 12시간 | 01~12 |
 * | h | 12시간 | 1~12 |
 * | HH | 0으로 패딩된 24시간 | 00~23 |
 * | H | 24시간 | 0~23 |
 * | mm | 0으로 패딩된 분 | 00~59 |
 * | m | 분 | 0~59 |
 * | ss | 0으로 패딩된 초 | 00~59 |
 * | s | 초 | 0~59 |
 * | fff | 밀리초 (3자리) | 000~999 |
 * | ff | 밀리초 (2자리) | 00~99 |
 * | f | 밀리초 (1자리) | 0~9 |
 * | zzz | 타임존 오프셋 (±HH:mm) | +09:00 |
 * | zz | 타임존 오프셋 (±HH) | +09 |
 * | z | 타임존 오프셋 (±H) | +9 |
 *
 * @example
 * ```typescript
 * formatDateTime("yyyy-MM-dd", { year: 2024, month: 3, day: 15 });
 * // "2024-03-15"
 *
 * formatDateTime("yyyy년 M월 d일 (ddd)", { year: 2024, month: 3, day: 15 });
 * // "2024년 3월 15일 (금)"
 *
 * formatDateTime("tt h:mm:ss", { hour: 14, minute: 30, second: 45 });
 * // "오후 2:30:45"
 * ```
 */
export declare function format(formatString: string, args: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
    timezoneOffsetMinutes?: number;
}): string;
//# sourceMappingURL=date-format.d.ts.map