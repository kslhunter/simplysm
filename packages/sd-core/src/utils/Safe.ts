export class Safe {
  public static obj<T>(value: T | undefined): Partial<T> {
    if (value === undefined) {
      return {};
    }

    return value;
  }

  public static arr<T>(value: T[] | undefined): T[] {
    if (value === undefined) {
      return [];
    }

    return value;
  }
}