import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  signal,
  viewChild,
  ViewEncapsulation
} from "@angular/core";
import {coercionBoolean} from "../utils/commons";
import {SdEventsDirective} from "../directives/SdEventsDirective";

@Component({
  selector: "sd-collapse",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdEventsDirective
  ],
  template: `
    <div #contentEl
         class="_content"
         (sdResize)="onContentResize()"
         [style.margin-top]="open() ? '' : (-this.contentHeight()) + 'px'">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    sd-collapse {
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
    "[attr.sd-open]": "open()"
  }
})
export class SdCollapseControl {
  open = input(false, {transform: coercionBoolean});

  contentElRef = viewChild.required<any, ElementRef<HTMLDivElement>>("contentEl", {read: ElementRef});

  contentHeight = signal(0);

  constructor() {
    effect(() => {
      this.contentHeight.set(this.contentElRef().nativeElement.offsetHeight);
    }, {allowSignalWrites: true});
  }

  onContentResize() {
    this.contentHeight.set(this.contentElRef().nativeElement.offsetHeight);
  }
}
