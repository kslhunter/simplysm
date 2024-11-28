import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";

/**
 * 팬 컨트롤 컴포넌트
 * 
 * @example
 * ```html
 * <sd-pane></sd-pane>
 * ```
 */
@Component({
  selector: "sd-pane",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-pane {
        display: block;
        position: relative;
        height: 100%;
        overflow: auto;
      }
    `,
  ],
  template: `
    <ng-content></ng-content> `,
})
export class SdPaneControl {
}
