export class Uuid {
    static newUuid(): Uuid {
        const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return new Uuid(uuid);
    }

    private _uuid: string;

    constructor(uuid: string) {
        this._uuid = uuid;
    }

    toString(): string {
        return this._uuid;
    }
}
