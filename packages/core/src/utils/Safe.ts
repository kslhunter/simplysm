export class Safe {
    static val<T>(value: T | undefined, newValue: T): T {
        if (value === undefined || value === null) {
            return newValue;
        }
        return value;
    }

    static obj<T>(value: T | undefined): Partial<T> {
        if (value === undefined || value === null) {
            return {};
        }
        return value;
    }

    static arr<T>(value: T[] | undefined): T[] {
        if (value === undefined || value === null) {
            return [];
        }
        return value;
    }
}
