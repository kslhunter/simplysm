export class DateOnly {
    private readonly _tick: number;

    public constructor(yearOrTick?: number, month?: number, date?: number) {
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
            throw new Error("@simplism/sd-core :: DateOnly :: 입력값이 잘못되었습니다.");
        }
    }

    public getFullYear(): number {
        return new Date(this._tick).getFullYear();
    }

    public getMonth(): number {
        return new Date(this._tick).getMonth();
    }

    public getDate(): number {
        return new Date(this._tick).getDate();
    }

    public getDay(): number {
        return new Date(this._tick).getDay();
    }

    public getTime(): number {
        return this._tick;
    }

    public addDates(days: number): DateOnly {
        return new Date(this._tick).addDates(days).toDateOnly();
    }

    public addMonths(months: number): DateOnly {
        return new Date(this._tick).addMonths(months).toDateOnly();
    }

    public addYears(years: number): DateOnly {
        return new Date(this._tick).addYears(years).toDateOnly();
    }

    public setDate(day: number): DateOnly {
        return new Date(new Date(this._tick).setDate(day)).toDateOnly();
    }

    public setMonth(month: number): DateOnly {
        return new Date(new Date(this._tick).setMonth(month)).toDateOnly();
    }

    public setFullYear(year: number): DateOnly {
        return new Date(new Date(this._tick).setFullYear(year)).toDateOnly();
    }

    public static parse(value: string | undefined): DateOnly | undefined {
        if (value == undefined) {
            return;
        }
        if (Date.parse(value)) {
            return new Date(Date.parse(value)).toDateOnly();
        }
        throw new Error("일자 형식이 잘못되었습니다.");
    }

    public toFormatString(format: string): string {
        return new Date(this._tick).toFormatString(format);
    }

    public toString(): string {
        return this.toFormatString("yyyy-MM-dd");
    }
}
