import { injectElementRef } from "../../../utils/injections/inject-element-ref";

export class SdSheetDomAccessor {
  private _elRef = injectElementRef();

  getRoot() {
    return this._elRef.nativeElement;
  }

  getContainer() {
    return this._elRef.nativeElement.findFirst<HTMLElement>("._sheet-container")!;
  }

  getTable() {
    return this.getContainer().findFirst<HTMLElement>("> table")!;
  }

  getTHead() {
    return this.getTable().findFirst<HTMLElement>("> thead")!;
  }

  getLastDepthFixedHeaders() {
    return this.getTHead().findAll<HTMLElement>("> tr > th._last-depth._fixed");
  }

  getFocusRowIndicator() {
    return this.getContainer().findFirst<HTMLElement>("> ._focus-row-indicator")!;
  }

  getFocusCellIndicator() {
    return this.getFocusRowIndicator().firstElementChild as HTMLElement;
  }

  getSelectRowIndicatorContainer() {
    return this.getContainer().findFirst<HTMLElement>("> ._select-row-indicator-container")!;
  }

  getSelectRowIndicators() {
    return this.getSelectRowIndicatorContainer().findAll<HTMLElement>("> ._select-row-indicator");
  }

  getColumnResizeIndicator() {
    return this.getContainer().findFirst<HTMLElement>("> ._resize-indicator")!;
  }

  getRow(r: number) {
    return this.getTable().findFirst<HTMLElement>(`> tbody > tr[r='${r}']`);
  }

  getCell(r: number, c: number) {
    return this.getRow(r)?.findFirst<HTMLElement>(` > td[c='${c}']`);
  }
}