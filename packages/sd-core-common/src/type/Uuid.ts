export class Uuid {
  private static readonly _prevUuids: Uuid[] = [];

  public static new(): Uuid {
    const fn = () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    let uuid: string;
    while (true) {
      uuid = fn();
      if (!Uuid._prevUuids.some((item) => item._uuid === uuid)) {
        break;
      }
    }

    const uuidObj = new Uuid(uuid);
    Uuid._prevUuids.push(uuidObj);
    return uuidObj;
  }

  private readonly _uuid: string;

  public constructor(uuid: string) {
    this._uuid = uuid;
  }

  public toString(): string {
    return this._uuid;
  }
}