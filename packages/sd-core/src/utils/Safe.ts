// tslint:disable-next-line:variable-name
export const Safe = {
  obj<T>(value: T | undefined): Partial<T> {
    if (value == undefined) {
      return {};
    }

    return value;
  },
  arr<T>(value: T[] | undefined): T[] {
    if (value == undefined) {
      return [];
    }

    return value;
  }
};
