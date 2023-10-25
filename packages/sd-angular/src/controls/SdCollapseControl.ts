import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  inject,
  Input
} from "@angular/core";
import {coercionBoolean} from "../utils/commons";
import {SdEventsDirective} from "../directives/SdEventsDirective";

@Component({
  selector: "sd-collapse",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdEventsDirective
  ],
  template: `
    <div class="_content"
         (sdResize)="onContentResize()"
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
  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-open")
  open = false;

  contentHeight = 0;

  get contentMarginTop(): string | undefined {
    return this.open ? undefined : `${-this.contentHeight}px`;
  }

  #elRef: ElementRef<HTMLElement> = inject(ElementRef);

  ngAfterContentInit() {
    this.contentHeight = this.#elRef.nativeElement.findFirst<HTMLDivElement>("> ._content")!.offsetHeight;
  }

  onContentResize() {
    this.contentHeight = this.#elRef.nativeElement.findFirst<HTMLDivElement>("> ._content")!.offsetHeight;
  }
}
