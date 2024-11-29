import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";

/**
 * 페인 컨트롤
 *
 * 스크롤이 가능한 컨테이너 영역을 제공하는 컨트롤
 *
 * @example
 *
 * <sd-pane>
 *   <div>컨텐츠 내용</div>
 * </sd-pane>
 *
 *
 * @remarks
 * - 내부 컨텐츠의 높이가 페인의 높이보다 클 경우 자동으로 스크롤바가 표시됨
 * - 부모 요소의 높이가 지정되어 있어야 정상적으로 동작
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
