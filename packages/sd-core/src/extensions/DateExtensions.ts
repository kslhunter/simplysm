import { DateOnly } from "../types/DateOnly";
import { Time } from "../types/Time";

declare global {
  interface Date {
    addSeconds(seconds: number): Date;

    addMinutes(minutes: number): Date;

    addHours(hours: number): Date;

    addDates(days: number): Date;

    addMonths(months: number): Date;

    addYears(years: number): Date;

    toDateOnly(): DateOnly;

    toTime(): Time;

    toFormatString(format: string): string;
  }
}

Date.prototype.addSeconds = function(seconds: number): any {
  if (!seconds) {
    return this;
  }
  const date = new Date(this.getTime());
  date.setSeconds(date.getSeconds() + seconds);

  return date;
};

Date.prototype.addMinutes = function(minutes: number): any {
  if (!minutes) {
    return this;
  }
  const date = new Date(this.getTime());
  date.setMinutes(date.getMinutes() + minutes);

  return date;
};

Date.prototype.addHours = function(hours: number): any {
  if (!hours) {
    return this;
  }
  const date = new Date(this.getTime());
  date.setHours(date.getHours() + hours);

  return date;
};

Date.prototype.addDates = function(days: number): any {
  if (!days) {
    return this;
  }
  const date = new Date(this.getTime());
  date.setDate(date.getDate() + days);

  return date;
};

Date.prototype.addMonths = function(months: number): any {
  if (!months) {
    return this;
  }
  const date = new Date(this.getTime());
  date.setMonth(date.getMonth() + months);

  return date;
};

Date.prototype.addYears = function(years: number): any {
  if (!years) {
    return this;
  }
  const date = new Date(this.getTime());
  date.setFullYear(date.getFullYear() + years);

  return date;
};

Date.prototype.toDateOnly = function(): any {
  return new DateOnly(this.getFullYear(), this.getMonth(), this.getDate());
};

Date.prototype.toTime = function(): any {
  return new Time(this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds());
};

Date.prototype.toFormatString = function(format: string): string {
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
  result = result.replace(/zz/g, `${offsetHour > 0 ? "+" : "-"}${Math.abs(offsetHour).toString().padStart(2, "0")}`);
  result = result.replace(/z/g, `${offsetHour > 0 ? "+" : "-"}${Math.abs(offsetHour).toString()}`);

  return result;
};
