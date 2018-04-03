export class DateOnly {
    private _tick: number;

    constructor(yearOrTick?: number, month?: number, date?: number) {
        if (yearOrTick === undefined && month === undefined && date === undefined) {
            this._tick = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
        }
        else if (yearOrTick !== undefined && month === undefined && date === undefined) {
            this._tick = yearOrTick;
        }
        else if (yearOrTick !== undefined && month !== undefined && date !== undefined) {
            this._tick = new Date(yearOrTick, month, date).getTime();
        }
        else {
            throw new Error("@simplism/core :: DateOnly :: 입력값이 잘못되었습니다.");
        }
    }

    getFullYear(): number {
        return new Date(this._tick).getFullYear();
    }

    getMonth(): number {
        return new Date(this._tick).getMonth();
    }

    getDate(): number {
        return new Date(this._tick).getDate();
    }

    getDay(): number {
        return new Date(this._tick).getDay();
    }

    getTime(): number {
        return this._tick;
    }

    addDates(days: number): DateOnly {
        return new Date(this._tick).addDates(days).toDateOnly();
    }

    addMonths(months: number): DateOnly {
        return new Date(this._tick).addMonths(months).toDateOnly();
    }

    addYears(years: number): DateOnly {
        return new Date(this._tick).addYears(years).toDateOnly();
    }

    setDate(day: number): DateOnly {
        return new Date(new Date(this._tick).setDate(day)).toDateOnly();
    }

    setMonth(month: number): DateOnly {
        return new Date(new Date(this._tick).setMonth(month)).toDateOnly();
    }

    setFullYear(year: number): DateOnly {
        return new Date(new Date(this._tick).setFullYear(year)).toDateOnly();
    }

    static parse(value: string | undefined): DateOnly | undefined {
        if (value === null || value === undefined) {
            return undefined;
        }
        if (Date.parse(value)) {
            return new Date(Date.parse(value)).toDateOnly();
        }
        return undefined;
    }

    toFormatString(format: string): string {
        return new Date(this._tick).toFormatString(format);
    }

    toString(): string {
        return this.toFormatString("yyyy-MM-dd");
    }
}
