export class Uuid {
  static #cnt = 1;
  static readonly #prevUuidTexts: string[] = [];

  static new(): Uuid {
    const fn = (): string => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r1 = Math.random() * (this.#cnt++);
      const r2 = r1 - Math.floor(r1);
      const r = r2 * 16 | 0;
      const v = c === "x" ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });

    let uuid = fn();
    while (this.#prevUuidTexts.includes(uuid)) {
      uuid = fn();
    }
    this.#prevUuidTexts.push(uuid);

    return new Uuid(uuid);
  }

  readonly #uuid: string;

  constructor(uuid: string) {
    this.#uuid = uuid;
  }

  toString(): string {
    return this.#uuid;
  }
}
