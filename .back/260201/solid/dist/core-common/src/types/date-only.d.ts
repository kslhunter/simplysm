/**
 * 날짜 클래스 (시간제외: yyyy-MM-dd, 불변)
 *
 * 시간 정보 없이 날짜만 저장하는 불변 클래스이다.
 * 로컬 타임존을 기준으로 동작한다.
 *
 * @example
 * const today = new DateOnly();
 * const specific = new DateOnly(2025, 1, 15);
 * const parsed = DateOnly.parse("2025-01-15");
 */
export declare class DateOnly {
    private static readonly MS_PER_DAY;
    readonly date: Date;
    /** 현재시간 */
    constructor();
    /** 연월일로 초기화 */
    constructor(year: number, month: number, day: number);
    /** tick (millisecond)으로 생성 */
    constructor(tick: number);
    /** Date 타입으로 생성 */
    constructor(date: Date);
    /**
     * 문자열을 DateOnly로 파싱
     * @param str 날짜 문자열
     * @returns DateOnly 인스턴스
     *
     * 지원 형식:
     * - `yyyy-MM-dd` (예: '2024-01-15') - 문자열에서 직접 추출, 타임존 영향 없음
     * - `yyyyMMdd` (예: '20240115') - 문자열에서 직접 추출, 타임존 영향 없음
     * - ISO 8601 (예: '2024-01-15T00:00:00Z') - UTC로 해석 후 로컬 타임존 변환
     *
     * @note 서버/클라이언트 타임존이 다른 경우 `yyyy-MM-dd` 형식 사용 권장
     * @note DST(일광절약시간) 지역에서 ISO 8601 형식 파싱 시, 파싱 대상 날짜의 오프셋을 사용합니다.
     */
    static parse(str: string): DateOnly;
    /**
     * 기준 연도와 월을 주차 정보를 기반으로 반환
     * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
     * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
     * @returns 해당 날짜가 속한 주차의 기준 연도와 월
     *
     * @example
     * // ISO 8601 표준 (월요일 시작, 첫 주 최소 4일)
     * new DateOnly(2024, 1, 1).getBaseYearMonthSeqForWeekSeq(1, 4)
     * // 미국식 (일요일 시작, 첫 주 최소 1일)
     * new DateOnly(2024, 1, 1).getBaseYearMonthSeqForWeekSeq(0, 1)
     */
    getBaseYearMonthSeqForWeekSeq(weekStartDay?: number, minDaysInFirstWeek?: number): {
        year: number;
        monthSeq: number;
    };
    /**
     * 주차 정보를 기반으로 해당 주의 시작 날짜 계산
     * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
     * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
     * @returns 해당 날짜가 속한 주의 시작 날짜
     */
    getWeekSeqStartDate(weekStartDay?: number, minDaysInFirstWeek?: number): DateOnly;
    /**
     * 연도 및 주차 순서 정보를 반환
     * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
     * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
     * @returns 연도와 해당 연도 기준 주차 번호
     *
     * @example
     * // ISO 8601 표준 (월요일 시작, 첫 주 4일 이상)
     * new DateOnly(2025, 1, 6).getWeekSeqOfYear(); // { year: 2025, weekSeq: 2 }
     *
     * // 미국식 (일요일 시작, 첫 주 1일 이상)
     * new DateOnly(2025, 1, 1).getWeekSeqOfYear(0, 1); // { year: 2025, weekSeq: 1 }
     */
    getWeekSeqOfYear(weekStartDay?: number, minDaysInFirstWeek?: number): {
        year: number;
        weekSeq: number;
    };
    /**
     * 해당 날짜의 연도, 월 및 주차(weekSeq) 정보를 반환
     * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
     * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
     * @returns 연도, 월 및 해당 월 기준 주차 번호
     *
     * @example
     * // ISO 8601 표준 (월요일 시작, 첫 주 4일 이상)
     * new DateOnly(2025, 1, 15).getWeekSeqOfMonth(); // { year: 2025, monthSeq: 1, weekSeq: 3 }
     *
     * // 미국식 (일요일 시작, 첫 주 1일 이상)
     * new DateOnly(2025, 1, 15).getWeekSeqOfMonth(0, 1); // { year: 2025, monthSeq: 1, weekSeq: 3 }
     */
    getWeekSeqOfMonth(weekStartDay?: number, minDaysInFirstWeek?: number): {
        year: number;
        monthSeq: number;
        weekSeq: number;
    };
    /**
     * 주차 정보를 기반으로 해당 주의 시작 날짜 가져오기
     * @param arg 연도, 선택적 월, 주차 번호
     * @param weekStartDay 주의 시작 요일 (0=일요일, 1=월요일, ..., 6=토요일). 기본값: 1(월요일)
     * @param minDaysInFirstWeek 첫 주로 간주할 최소 일수 (1~7). 기본값: 4 (ISO 8601 표준)
     * @returns 해당 주차의 시작 날짜
     *
     * @example
     * // 2025년 2주차의 시작일 (ISO 8601 표준)
     * DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 }); // 2025-01-06 (월요일)
     *
     * // 2025년 1월 3주차의 시작일
     * DateOnly.getDateByYearWeekSeq({ year: 2025, month: 1, weekSeq: 3 }); // 2025-01-13 (월요일)
     */
    static getDateByYearWeekSeq(arg: {
        year: number;
        month?: number;
        weekSeq: number;
    }, weekStartDay?: number, minDaysInFirstWeek?: number): DateOnly;
    /** 날짜 세팅이 제대로 되었는지 여부 */
    get isValid(): boolean;
    get year(): number;
    get month(): number;
    get day(): number;
    get tick(): number;
    /** 요일 (일~토: 0~6) */
    get dayOfWeek(): number;
    /** 지정된 연도로 새 인스턴스 반환 */
    setYear(year: number): DateOnly;
    /**
     * 지정된 월로 새 DateOnly 인스턴스를 반환
     * @param month 설정할 월 (1-12, 범위 외 값은 연도 조정)
     * @note 대상 월의 일수보다 현재 일자가 크면 해당 월의 마지막 날로 조정됨
     *       (예: 1월 31일에서 setMonth(2) → 2월 28일 또는 29일)
     */
    setMonth(month: number): DateOnly;
    /**
     * 지정된 일자로 새 DateOnly 인스턴스를 반환
     * @param day 설정할 일자
     * @note 해당 월의 유효 범위를 벗어나는 일자는 JavaScript Date 기본 동작에 따라
     *       자동으로 다음/이전 달로 조정됨 (예: 1월에 day=32 → 2월 1일)
     */
    setDay(day: number): DateOnly;
    /** 지정된 연수를 더한 새 인스턴스 반환 */
    addYears(years: number): DateOnly;
    /** 지정된 월수를 더한 새 인스턴스 반환 */
    addMonths(months: number): DateOnly;
    /** 지정된 일수를 더한 새 인스턴스 반환 */
    addDays(days: number): DateOnly;
    /**
     * 지정된 포맷으로 문자열 변환
     * @param format 포맷 문자열
     * @see dtFormat 지원 포맷 문자열 참조
     */
    toFormatString(formatStr: string): string;
    toString(): string;
}
//# sourceMappingURL=date-only.d.ts.map