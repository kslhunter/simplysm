import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  HostListener,
  Inject,
  Input
} from "@angular/core";
import {SdSelectControl} from "./SdSelectControl";

@Component({
  selector: "sd-select-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdSelectItemControl {
  @HostBinding("attr.tabindex")
  public tabIndex = 0;

  @Input()
  public value?: any;

  public get content(): string {
    return this._elRef.nativeElement.innerHTML.trim();
  }

  public constructor(@Inject(forwardRef(() => SdSelectControl))
                     private readonly _selectControl: SdSelectControl,
                     private readonly _elRef: ElementRef<HTMLElement>) {
  }

  @HostListener("click", ["$event"])
  public onClick(): void {
    this._selectControl.setValue(this.value);
  }
}