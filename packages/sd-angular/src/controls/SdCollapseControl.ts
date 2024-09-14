import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  signal,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdEventsDirective } from "../directives/SdEventsDirective";

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
    <div #contentEl class="_content" (sdResize)="onContentResize()" [style.margin-top]="marginTop()">
      <ng-content></ng-content>
    </div>
  `,
  host: {
    "[attr.sd-open]": "open",
  },
})
export class SdCollapseControl {
  open = input(false);

  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>("contentEl", { read: ElementRef });

  contentHeight = signal(0);

  marginTop = computed(() => (this.open() ? "" : -this.contentHeight() + "px"));

  constructor() {
    effect(
      () => {
        this.contentHeight.set(this.contentElRef().nativeElement.offsetHeight);
      },
      { allowSignalWrites: true },
    );
  }

  onContentResize() {
    this.contentHeight.set(this.contentElRef().nativeElement.offsetHeight);
  }
}
