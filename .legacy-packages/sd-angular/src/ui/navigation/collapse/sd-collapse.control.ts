import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdEventsDirective } from "../../../core/directives/sd-events.directive";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { $signal } from "../../../core/utils/bindings/$signal";
import { $computed } from "../../../core/utils/bindings/$computed";
import { $effect } from "../../../core/utils/bindings/$effect";

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

        &[data-sd-open="false"] > ._content {
          transition: margin-top 0.1s ease-in;
        }

        &[data-sd-open="true"] > ._content {
          transition: margin-top 0.1s ease-out;
        }
      }
    `,
  ],
  template: `
    <div
      #contentEl
      class="_content"
      (sdResize)="onContentResize()"
      [style.margin-top]="marginTop()"
    >
      <ng-content></ng-content>
    </div>
  `,
  host: {
    "[attr.data-sd-open]": "open()",
  },
})
export class SdCollapseControl {
  open = input(false, { transform: transformBoolean });

  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>("contentEl", {
    read: ElementRef,
  });

  contentHeight = $signal(0);

  marginTop = $computed(() => (this.open() ? "" : -this.contentHeight() + "px"));

  constructor() {
    $effect(() => {
      this.contentHeight.set(this.contentElRef().nativeElement.offsetHeight);
    });
  }

  onContentResize() {
    this.contentHeight.set(this.contentElRef().nativeElement.offsetHeight);
  }
}
