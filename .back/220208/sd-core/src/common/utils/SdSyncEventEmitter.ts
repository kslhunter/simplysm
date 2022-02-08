export class SdEventEmitter {
  private readonly _eventListener = new Map<string | symbol, ((...args: any[]) => (void | Promise<void>))[]>();

  public on(event: string | symbol, listener: (...args: any[]) => (void | Promise<void>)): this {
    if (this._eventListener.has(event)) {
      this._eventListener.get(event)!.push(listener);
    }
    else {
      this._eventListener.set(event, [listener]);
    }

    return this;
  }

  public off(event: string | symbol, listener: (...args: any[]) => (void | Promise<void>)): this {
    this._eventListener.get(event)?.remove((item) => item === listener);
    return this;
  }

  public async emit(event: string | symbol, ...args: any[]): Promise<void> {
    const arr = this._eventListener.get(event);
    if (!arr) return;

    for (const listener of arr) {
      await listener(args);
    }
  }
}