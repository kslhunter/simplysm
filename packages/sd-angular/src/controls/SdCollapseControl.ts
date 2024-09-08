import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild, ViewEncapsulation } from "@angular/core";
import { coercionBoolean } from "../utils/commons";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { sdContentInit } from "../utils/hooks";

@Component({
  selector: "sd-collapse",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective],
  template: `
    <div
      #contentEl
      class="_content"
      (sdResize)="onContentResize()"
      [style.margin-top]="open ? '' : -contentHeight + 'px'"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      sd-collapse {
        display: block;
        overflow: hidden;

        &[sd-open="false"] > ._content {
          transition: margin-top 0.1s ease-in;
        }

        &[sd-open="true"] > ._content {
          transition: margin-top 0.1s ease-out;
        }
      }
    `,
  ],
  host: {
    "[attr.sd-open]": "open",
  },
})
export class SdCollapseControl {
  @Input({ transform: coercionBoolean }) open = false;

  @ViewChild("contentEl", { static: true }) contentElRef!: ElementRef<HTMLElement>;

  contentHeight = 0;

  constructor() {
    sdContentInit(this, () => {
      this.contentHeight = this.contentElRef.nativeElement.offsetHeight;
    });
  }

  onContentResize() {
    this.contentHeight = this.contentElRef.nativeElement.offsetHeight;
  }
}
