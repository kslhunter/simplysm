import {AfterContentInit, ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild} from "@angular/core";
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
    <div #contentEl
         class="_content"
         (sdResize)="onContentResize()"
         [style.margin-top]="open ? '' : (-this.contentHeight) + 'px'">
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
  `],
  host: {
    "[attr.sd-open]": "open"
  }
})
export class SdCollapseControl implements AfterContentInit {
  @Input({transform: coercionBoolean}) open = false;

  @ViewChild("contentEl", {static: true}) contentElRef!: ElementRef<HTMLElement>;

  contentHeight = 0;

  ngAfterContentInit() {
    this.contentHeight = this.contentElRef.nativeElement.offsetHeight;
  }

  onContentResize() {
    this.contentHeight = this.contentElRef.nativeElement.offsetHeight;
  }
}
