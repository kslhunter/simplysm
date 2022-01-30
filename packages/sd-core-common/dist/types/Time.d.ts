export declare class Time {
    private _tick;
    constructor();
    constructor(hour: number, minute: number, second?: number, millisecond?: number);
    constructor(tick: number);
    static parse(str: string): Time;
    get hour(): number;
    set hour(value: number);
    get minute(): number;
    set minute(value: number);
    get second(): number;
    set second(value: number);
    get millisecond(): number;
    set millisecond(value: number);
    get tick(): number;
    set tick(tick: number);
    setHour(hour: number): Time;
    setMinute(minute: number): Time;
    setSecond(second: number): Time;
    setMillisecond(millisecond: number): Time;
    addHours(hours: number): Time;
    addMinutes(minutes: number): Time;
    addSeconds(seconds: number): Time;
    addMilliseconds(milliseconds: number): Time;
    toFormatString(format: string): string;
    toString(): string;
}
