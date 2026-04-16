import { DestroyRef, Directive, ElementRef, inject, output } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { shouldProcessCommandEvent } from "./findTopOpenModalEl";

@Directive({
  selector: "[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]",
  standalone: true,
})
export class SdCommandDirective {
  private readonly _elRef = inject(ElementRef);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _document = inject(DOCUMENT);

  sdRefreshCommand = output<KeyboardEvent>();
  sdSaveCommand = output<KeyboardEvent>();
  sdInsertCommand = output<KeyboardEvent>();

  constructor() {
    const listener = (event: KeyboardEvent): void => {
      if (!event.ctrlKey || event.shiftKey) return;

      if ((event.key === "l" || event.key === "L") && event.altKey) {
        if (!shouldProcessCommandEvent(this._document, this._elRef.nativeElement)) return;
        event.preventDefault();
        event.stopPropagation();
        this.sdRefreshCommand.emit(event);
      } else if ((event.key === "s" || event.key === "S") && !event.altKey) {
        if (!shouldProcessCommandEvent(this._document, this._elRef.nativeElement)) return;
        event.preventDefault();
        event.stopPropagation();
        this.sdSaveCommand.emit(event);
      } else if (event.key === "Insert" && !event.altKey) {
        if (!shouldProcessCommandEvent(this._document, this._elRef.nativeElement)) return;
        event.preventDefault();
        event.stopPropagation();
        this.sdInsertCommand.emit(event);
      }
    };

    this._document.addEventListener("keydown", listener);

    this._destroyRef.onDestroy(() => {
      this._document.removeEventListener("keydown", listener);
    });
  }
}
