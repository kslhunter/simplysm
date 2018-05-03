import { Injectable } from "@angular/core";

@Injectable()
export class SdBusyProvider {
  private _$busy: JQuery;
  private _count = 0;
  private _$prevActivate: JQuery | undefined;

  public constructor() {
    this._$busy = $("<div class='_sd-busy'><div><div></div><div></div></div></div>").appendTo($("body"));
    this._$busy.get(0).offsetHeight;
  }

  public async show(): Promise<void> {
    this._count++;
    if (this._count > 0) {
      document.addEventListener("focus", this._prevent.bind(this), true);
      this._$prevActivate = document.activeElement ? $(document.activeElement) : undefined;
      if (this._$prevActivate) {
        this._$prevActivate.trigger("blur");
      }
      await new Promise((resolve) => {
        this._$busy.addClass("_open");
        resolve();
      });
    }
  }

  public hide(): void {
    this._count--;
    if (this._count < 1) {
      this._$busy.removeClass("_open");
      document.removeEventListener("focus", this._prevent.bind(this), true);
      if (this._$prevActivate) {
        this._$prevActivate.trigger("focus");
      }
    }
  }

  private _prevent(e: Event): void {
    e.preventDefault();
  }
}