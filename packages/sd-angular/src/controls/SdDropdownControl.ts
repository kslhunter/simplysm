import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  OnInit
} from "@angular/core";
import {SdComponentBase} from "../bases/SdComponentBase";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-dropdown",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdDropdownControl}]
})
export class SdDropdownControl extends SdComponentBase implements OnInit, OnDestroy {
  @Input()
  @SdTypeValidate(Boolean)
  public open?: boolean;

  public parentEl?: HTMLElement;

  public constructor(private readonly _elRef: ElementRef<HTMLElement>,
                     private readonly _appRef: ApplicationRef) {
    super();
  }

  @HostBinding("style.display")
  public get display(): string {
    return this.open ? "block" : "none";
  }

  @HostBinding("style.top.px")
  public get top(): number | undefined {
    return (this.parentEl && this.open)
      ? this.parentEl.offsetTop + this.parentEl.offsetHeight
      : undefined;
  }

  @HostBinding("style.left.px")
  public get left(): number | undefined {
    return (this.parentEl && this.open)
      ? this.parentEl.offsetLeft
      : undefined;
  }

  @HostBinding("style.min-width.px")
  public get minWidth(): number | undefined {
    return (this.parentEl && this.open)
      ? this.parentEl.offsetWidth
      : undefined;
  }

  public ngOnInit(): void {
    this.parentEl = this._elRef.nativeElement.parentElement as HTMLElement;
    const rootEl = this._appRef.components[0].location.nativeElement as HTMLElement;
    rootEl.appendChild(this._elRef.nativeElement);
  }

  public ngOnDestroy(): void {
    this._elRef.nativeElement.remove();
  }
}
