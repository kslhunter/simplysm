import {ArgumentsException} from "../exceptions/ArgumentsException";

export class DateTime {
    private _date: Date;

    public constructor();
    public constructor(value: number);
    public constructor(value: string);
    public constructor(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, milliseconds?: number);
    public constructor(...args: any[]) {
        if (args.length === 0) this._date = new Date();
        else if (args.length === 1) this._date = new Date(args[0]);
        else if (args.length === 2) this._date = new Date(args[0], args[1]);
        else if (args.length === 3) this._date = new Date(args[0], args[1], args[2]);
        else if (args.length === 4) this._date = new Date(args[0], args[1], args[2], args[3]);
        else if (args.length === 5) this._date = new Date(args[0], args[1], args[2], args[3], args[4]);
        else if (args.length === 6) this._date = new Date(args[0], args[1], args[2], args[3], args[4], args[5]);
        else if (args.length === 7) this._date = new Date(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        else throw new ArgumentsException({args});
    }

    public getFullYear(): number {
        return this._date.getFullYear();
    }

    public getMonth(): number {
        return this._date.getMonth();
    }

    public getDate(): number {
        return this._date.getDate();
    }

    public getHours(): number {
        return this._date.getHours();
    }

    public getMinutes(): number {
        return this._date.getMinutes();
    }

    public getSeconds(): number {
        return this._date.getSeconds();
    }

    public getMilliseconds(): number {
        return this._date.getMilliseconds();
    }

    public getTimezoneOffset(): number {
        return this._date.getTimezoneOffset();
    }

    public getDay(): number {
        return this._date.getDay();
    }

    public toFormatString(format: string): string {
        const year = this.getFullYear();
        const month = this.getMonth() + 1;
        const day = this.getDate();
        const hour = this.getHours();
        const minute = this.getMinutes();
        const second = this.getSeconds();
        const milliSecond = this.getMilliseconds();
        const offsetHour = -Math.floor(this.getTimezoneOffset() / 60);
        const offsetMinute = -this.getTimezoneOffset() % 60;

        const weekString =
            this.getDay() === 0 ? "일" :
                this.getDay() === 1 ? "월" :
                    this.getDay() === 2 ? "화" :
                        this.getDay() === 3 ? "수" :
                            this.getDay() === 4 ? "목" :
                                this.getDay() === 5 ? "금" :
                                    this.getDay() === 6 ? "토" :
                                        "";

        let result = format;
        result = result.replace(/yyyy/g, year.toString());
        result = result.replace(/yyy/g, year.toString().substr(1, 3));
        result = result.replace(/yy/g, year.toString().substr(2, 2));
        result = result.replace(/y/g, year.toString().substr(3, 1));

        result = result.replace(/MM/g, month.toString().padStart(2, "0"));
        result = result.replace(/M/g, month.toString());

        result = result.replace(/dddd/g, `${weekString}요일`);
        result = result.replace(/ddd/g, weekString);

        result = result.replace(/dd/g, day.toString().padStart(2, "0"));
        result = result.replace(/d/g, day.toString());

        result = result.replace(/tt/g, hour < 12 ? "오전" : "오후");

        result = result.replace(/hh/g, (hour % 12).toString().padStart(2, "0"));
        result = result.replace(/h/g, (hour % 12).toString());

        result = result.replace(/HH/g, hour.toString().padStart(2, "0"));
        result = result.replace(/H/g, hour.toString());

        result = result.replace(/mm/g, minute.toString().padStart(2, "0"));
        result = result.replace(/m/g, minute.toString());

        result = result.replace(/ss/g, second.toString().padStart(2, "0"));
        result = result.replace(/s/g, second.toString());

        result = result.replace(/fff/g, milliSecond.toString().padStart(3, "0"));
        result = result.replace(/ff/g, milliSecond.toString().padStart(3, "0").substr(0, 2));
        result = result.replace(/f/g, milliSecond.toString().padStart(3, "0").substr(0, 1));

        result = result.replace(/zzz/g, `${offsetHour > 0 ? "+" : "-"}${Math.abs(offsetHour).toString().padStart(2, "0")}:${Math.abs(offsetMinute).toString().padStart(2, "0")}`);
        result = result.replace(/zz/g, (offsetHour > 0 ? "+" : "-") + Math.abs(offsetHour).toString().padStart(2, "0"));
        result = result.replace(/z/g, (offsetHour > 0 ? "+" : "-") + Math.abs(offsetHour).toString());

        return result;
    }
}