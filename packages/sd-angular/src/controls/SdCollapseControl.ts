import {AfterContentInit, ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input} from "@angular/core";
import {ResizeEvent} from "@simplysm/sd-core-browser";
import {SdInputValidate} from "../commons/SdInputValidate";

@Component({
  selector: "sd-collapse",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content"
         (sdResize)="onContentResize($event)"
         [style.marginTop]="contentMarginTop"
         [style.transition]="contentTransition">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      overflow: hidden;
    }
  `]
})
export class SdCollapseControl implements AfterContentInit {
  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  public contentHeight = 0;

  public get contentMarginTop(): string | undefined {
    return this.open ? undefined : `${-this.contentHeight}px`;
  }

  public get contentTransition(): string | undefined {
    return this.open === undefined ? undefined
      : this.open ? "margin-top .1s ease-out" : "margin-top .1s ease-in";
  }

  public constructor(private readonly _elRef: ElementRef) {
  }

  public ngAfterContentInit(): void {
    this.contentHeight = (this._elRef.nativeElement as HTMLElement).findFirst("> ._content")!.offsetHeight;
  }

  public onContentResize(event: ResizeEvent): void {
    if (event.prevHeight !== event.newHeight) {
      this.contentHeight = (this._elRef.nativeElement as HTMLElement).findFirst("> ._content")!.offsetHeight;
    }
  }
}