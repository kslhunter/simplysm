import { Wait } from "./Wait";
export class FunctionQueue {
    constructor(_gap) {
        this._gap = _gap;
        this._queue = [];
        this._isQueueRunning = false;
    }
    run(fn) {
        this._queue.push(fn);
        if (this._isQueueRunning)
            return;
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        (async () => {
            this._isQueueRunning = true;
            while (true) {
                const runningFn = this._queue.shift();
                if (!runningFn)
                    break;
                await runningFn();
                if (this._gap !== undefined && this._gap > 0) {
                    await Wait.time(this._gap);
                }
            }
            this._isQueueRunning = false;
        })();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRnVuY3Rpb25RdWV1ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9GdW5jdGlvblF1ZXVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFFOUIsTUFBTSxPQUFPLGFBQWE7SUFJeEIsWUFBb0MsSUFBYTtRQUFiLFNBQUksR0FBSixJQUFJLENBQVM7UUFIaEMsV0FBTSxHQUFtQyxFQUFFLENBQUM7UUFDckQsb0JBQWUsR0FBRyxLQUFLLENBQUM7SUFHaEMsQ0FBQztJQUVNLEdBQUcsQ0FBQyxFQUE4QjtRQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyQixJQUFJLElBQUksQ0FBQyxlQUFlO1lBQUUsT0FBTztRQUVqQyxtRUFBbUU7UUFDbkUsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNWLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQzVCLE9BQU8sSUFBSSxFQUFFO2dCQUNYLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxTQUFTO29CQUFFLE1BQU07Z0JBQ3RCLE1BQU0sU0FBUyxFQUFFLENBQUM7Z0JBQ2xCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUU7b0JBQzVDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzVCO2FBQ0Y7WUFDRCxJQUFJLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQztRQUMvQixDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ1AsQ0FBQztDQUNGIn0=