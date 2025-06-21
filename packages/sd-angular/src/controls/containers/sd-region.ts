import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { SdDockContainerControl } from "../sd-dock-container.control";
import { SdDockControl } from "../sd-dock.control";
import { SdPaneControl } from "../sd-pane.control";

@Component({
  selector: "sd-region",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDockContainerControl, SdDockControl, SdPaneControl],
  styles: [
    /* language=SCSS */ `
      sd-region {
        display: block;
        height: 100%;
        padding: var(--gap-xs);

        > sd-dock-container {
          //position: relative;
          //height: 100%;
          overflow: auto;
          background: var(--control-color);
          border-radius: var(--border-radius-lg);

          > ._content > ._title {
            //position: sticky;
            //top: 0;

            border-top-left-radius: var(--border-radius-lg);
            border-top-right-radius: var(--border-radius-lg);
            background: var(--control-color);
            z-index: var(--z-index-sidebar);
            padding: var(--gap-default);
            font-size: var(--font-size-sm);
            color: var(--text-trans-lighter);
          }
        }
      }
    `,
  ],
  template: `
    <sd-dock-container>
      @if (header()) {
        <sd-dock class="_title">
          {{ header() }}
        </sd-dock>
      }
      <sd-pane [class]="contentClass()">
        <ng-content></ng-content>
      </sd-pane>
    </sd-dock-container>
  `,
})
export class SdRegionControl {
  header = input<string>();

  contentClass = input<string>();
}
