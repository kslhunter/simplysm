export declare class DateOnly {
    readonly date: Date;
    constructor();
    constructor(year: number, month: number, day: number);
    constructor(tick: number);
    constructor(date: Date);
    static parse(str: string): DateOnly;
    static getByMonthWeekFirstDate(month: DateOnly, week: number, offsetWeek?: number, startWeek?: number): DateOnly;
    /**
     * 특정 날짜의 월별주차 가져오기
     * - 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6
     * @param {DateOnly} date 확인날짜
     * @param {number} offsetWeek 이 요일이 포함된 월의 주차로 인식됨 (기본값: 4=목요일)
     * @param {number} startWeek 이 요일을 시작요일로 봄 (기본값: 1=월요일)
     * @returns {{month: DateOnly; week: number}}
     */
    static getWeekOfMonth(date: DateOnly, offsetWeek?: number, startWeek?: number): IWeekOfMonth;
    get isValidDate(): boolean;
    get year(): number;
    set year(value: number);
    get month(): number;
    set month(value: number);
    get day(): number;
    set day(value: number);
    get tick(): number;
    set tick(tick: number);
    get week(): number;
    setYear(year: number): DateOnly;
    setMonth(month: number): DateOnly;
    setDay(day: number): DateOnly;
    addYears(years: number): DateOnly;
    addMonths(months: number): DateOnly;
    addDays(days: number): DateOnly;
    toFormatString(format: string): string;
    toString(): string;
}
export interface IWeekOfMonth {
    month: DateOnly;
    weekNum: number;
    startDate: DateOnly;
    endDate: DateOnly;
}
