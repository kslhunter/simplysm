import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { $computed, $effect } from "../utils/$hooks";
import { $reactive } from "../utils/$reactive";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-collapse",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective],
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
  template: `
    <div #contentEl class="_content" (sdResize)="onContentResize()" [style.margin-top]="marginTop$.value">
      <ng-content></ng-content>
    </div>
  `,
})
export class SdCollapseControl {
  open = input(false);

  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>("contentEl", { read: ElementRef });

  contentHeight$ = $reactive(0);

  marginTop$ = $computed(() => (this.open() ? "" : -this.contentHeight$.value + "px"));

  constructor() {
    $hostBinding("attr.sd-open", this.open);

    $effect(() => {
      this.contentHeight$.value = this.contentElRef().nativeElement.offsetHeight;
    });
  }

  onContentResize() {
    this.contentHeight$.value = this.contentElRef().nativeElement.offsetHeight;
  }
}
