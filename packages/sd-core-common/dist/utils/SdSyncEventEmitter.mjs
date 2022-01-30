export class SdEventEmitter {
    constructor() {
        this._eventListener = new Map();
    }
    on(event, listener) {
        if (this._eventListener.has(event)) {
            this._eventListener.get(event).push(listener);
        }
        else {
            this._eventListener.set(event, [listener]);
        }
        return this;
    }
    off(event, listener) {
        this._eventListener.get(event)?.remove((item) => item === listener);
        return this;
    }
    async emit(event, ...args) {
        const arr = this._eventListener.get(event);
        if (!arr)
            return;
        for (const listener of arr) {
            await listener(args);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RTeW5jRXZlbnRFbWl0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL1NkU3luY0V2ZW50RW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLE9BQU8sY0FBYztJQUEzQjtRQUNtQixtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFtRSxDQUFDO0lBMEIvRyxDQUFDO0lBeEJRLEVBQUUsQ0FBQyxLQUFzQixFQUFFLFFBQW9EO1FBQ3BGLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2hEO2FBQ0k7WUFDSCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1NBQzVDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRU0sR0FBRyxDQUFDLEtBQXNCLEVBQUUsUUFBb0Q7UUFDckYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUM7UUFDcEUsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRU0sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFzQixFQUFFLEdBQUcsSUFBVztRQUN0RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU87UUFFakIsS0FBSyxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7WUFDMUIsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDdEI7SUFDSCxDQUFDO0NBQ0YifQ==