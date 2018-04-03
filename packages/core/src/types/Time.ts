export class Time {
    private _tick: number;

    constructor(...args: number[]) {
        //hour, minute, second, millisecond
        if (args.length === 4) {
            this._tick = args[3] //ms
                + args[2] * 1000 //s
                + args[1] * 60 * 1000 //m
                + args[0] * 60 * 60 * 1000; //h
        }
        //hour, minute, second
        else if (args.length === 3) {
            this._tick = args[2] * 1000 //s
                + args[1] * 60 * 1000 //m
                + args[0] * 60 * 60 * 1000; //h
        }
        //hour, minute
        else if (args.length === 2) {
            this._tick = args[1] * 60 * 1000 //m
                + args[0] * 60 * 60 * 1000; //h
        }
        //tick
        else if (args.length === 1) {
            this._tick = args[0];
        }
        //none
        else if (args.length === 0) { //
            const curr = new Date();
            this._tick = curr.getMilliseconds()
                + curr.getSeconds() * 1000
                + curr.getMinutes() * 60 * 1000
                + curr.getHours() * 60 * 60 * 1000;
        }
        else {
            throw new Error("입력값이 잘못 되었습니다.");
        }
    }

    getDays(): number {
        return Math.floor(this._tick / (24 * 60 * 60 * 1000));
    }

    getHours(): number {
        return Math.floor(this._tick / (60 * 60 * 1000)) % 24;
    }

    getMinutes(): number {
        return Math.floor(this._tick / (60 * 1000)) % 60;
    }

    getSeconds(): number {
        return Math.floor(this._tick / 1000) % 60;
    }

    getMilliSeconds(): number {
        return this._tick % 1000;
    }


    getTotalHours(): number {
        return this._tick / (60 * 60 * 1000);
    }

    getTotalMinutes(): number {
        return this._tick / (60 * 1000);
    }

    getTotalSeconds(): number {
        return this._tick / 1000;
    }

    getTotalMilliSeconds(): number {
        return this._tick;
    }


    addDays(value: number): Time {
        return new Time(this._tick + (value * 24 * 60 * 60 * 1000));
    }

    addHours(value: number): Time {
        return new Time(this._tick + (value * 60 * 60 * 1000));
    }

    addMinutes(value: number): Time {
        return new Time(this._tick + (value * 60 * 1000));
    }

    addSeconds(value: number): Time {
        return new Time(this._tick + (value * 1000));
    }

    addMilliSeconds(value: number): Time {
        return new Time(this._tick + value);
    }

    static parse(value: string): Time {
        let tick: number | undefined;

        //03, 3
        if (value.length <= 2 && Number(value)) {
            const hour = Number(value);
            tick = hour * 60 * 60 * 1000;
        }
        //330
        else if (value.length === 3 && Number(value)) {
            const hour = Math.floor(Number(value) / 100);
            const minute = Number(value) % 100;
            tick = hour * 60 * 60 * 1000
                + minute * 60 * 1000;
        }
        //0330
        else if (value.length === 4 && Number(value)) {
            const hour = Math.floor(Number(value) / 100);
            const minute = Number(value) % 100;
            tick = hour * 60 * 60 * 1000
                + minute * 60 * 1000;
        }
        //3:30, 03:30
        else if (value.split(":").length === 2) {
            const hour = Number(value.split(":")[0]);
            const minute = Number(value.split(":")[1]);
            tick = hour * 60 * 60 * 1000
                + minute * 60 * 1000;
        }
        //033059
        else if (value.length === 6 && Number(value)) {
            const hour = Math.floor(Number(value) / 10000);
            const minute = Math.floor((Number(value) % 10000) / 100);
            const second = (Number(value) % 10000) % 100;
            tick = hour * 60 * 60 * 1000
                + minute * 60 * 1000
                + second * 1000;
        }
        //3.03:30:59
        else if (value.split(".").length === 2 && value.split(":").length === 3) {
            const day = Number(value.split(".")[0]);
            const hour = Number(value.split(".")[1].split(":")[0]);
            const minute = Number(value.split(".")[1].split(":")[1]);
            const second = Number(value.split(".")[1].split(":")[2]);
            tick = day * 24 * 60 * 60 * 1000
                + hour * 60 * 60 * 1000
                + minute * 60 * 1000
                + second * 1000;
        }
        //3.03:30:59.104
        else if (value.split(".").length === 3 && value.split(":").length === 3) {
            const day = Number(value.split(".")[0]);
            const hour = Number(value.split(".")[1].split(":")[0]);
            const minute = Number(value.split(".")[1].split(":")[1]);
            const second = Number(value.split(".")[1].split(":")[2]);
            const milliSecond = Number(value.split(".")[2]);
            tick = day * 24 * 60 * 60 * 1000
                + hour * 60 * 60 * 1000
                + minute * 60 * 1000
                + second * 1000
                + milliSecond;
        }
        // 03:30:59, 3:30:59
        else if (value.split(":").length === 3) {
            const hour = Number(value.split(":")[0]);
            const minute = Number(value.split(":")[1]);
            const second = Number(value.split(":")[2]);
            tick = hour * 60 * 60 * 1000
                + minute * 60 * 1000
                + second * 1000;
        }

        if (tick === undefined) {
            throw new Error("시간 포맷이 잘못되었습니다.");
        }

        return new Time(tick);
    }

    toFormatString(format: string): string {
        return format
            .replace(/d/g, this.getDays().toString())
            .replace(/HH/g, this.getHours().toString().padStart(2, "0"))
            .replace(/hh/g, (this.getHours() % 12).toString().padStart(2, "0"))
            .replace(/H/g, this.getHours().toString())
            .replace(/h/g, (this.getHours() % 12).toString())
            .replace(/mm/g, this.getMinutes().toString().padStart(2, "0"))
            .replace(/m/g, this.getMinutes().toString())
            .replace(/ss/g, this.getSeconds().toString().padStart(2, "0"))
            .replace(/s/g, this.getSeconds().toString())
            .replace(/fff/g, this.getMilliSeconds().toString().padStart(3, "0"))
            .replace(/ff/g, this.getMilliSeconds().toString().padStart(3, "0").substr(0, 2))
            .replace(/f/g, this.getMilliSeconds().toString().padStart(3, "0").substr(0, 1));
    }

    toString(): string {
        return this.toFormatString("d.HH:mm:ss");
    }
}
