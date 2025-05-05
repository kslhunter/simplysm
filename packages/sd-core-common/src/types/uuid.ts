export class Uuid {
  private static cnt = 1;
  private static readonly _prevUuidTexts: string[] = [];

  static new(): Uuid {
    const fn = (): string => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r1 = Math.random() * (this.cnt++);
      const r2 = r1 - Math.floor(r1);
      const r = r2 * 16 | 0;
      const v = c === "x" ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });

    let uuid = fn();
    while (Uuid._prevUuidTexts.includes(uuid)) {
      uuid = fn();
    }
    Uuid._prevUuidTexts.push(uuid);

    return new Uuid(uuid);
  }

  private readonly _uuid: string;

  constructor(uuid: string) {
    this._uuid = uuid;
  }

  toString(): string {
    return this._uuid;
  }
}
