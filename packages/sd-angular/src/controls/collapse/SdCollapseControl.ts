import {AfterContentInit, ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input} from "@angular/core";
import {ISdResizeEvent} from "@simplysm/sd-core-browser";
import {SdInputValidate} from "../../utils/SdInputValidate";

@Component({
  selector: "sd-collapse",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_content"
         (sdResize)="onContentResize($event)"
         [style.margin-top]="contentMarginTop">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      overflow: hidden;

      &[sd-open=false] > ._content {
        transition: margin-top .1s ease-in;
      }

      &[sd-open=true] > ._content {
        transition: margin-top .1s ease-out;
      }
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

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public ngAfterContentInit(): void {
    this.contentHeight = this._elRef.nativeElement.findFirst<HTMLDivElement>("> ._content")!.offsetHeight;
  }

  public onContentResize(event: ISdResizeEvent): void {
    if (event.prevHeight !== event.newHeight) {
      this.contentHeight = this._elRef.nativeElement.findFirst<HTMLDivElement>("> ._content")!.offsetHeight;
    }
  }
}
