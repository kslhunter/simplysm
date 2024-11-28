import { ChangeDetectionStrategy, Component, contentChildren, ViewEncapsulation } from "@angular/core";
import { SdDockControl } from "./SdDockControl";
import { $effect } from "../utils/$hooks";
import { injectElementRef } from "../utils/injectElementRef";

/**
 * 도킹 컨테이너 컨트롤 컴포넌트
 * 
 * 도킹 패널들을 포함하고 관리하는 컨테이너 컴포넌트입니다.
 * 각 도킹 패널의 위치와 크기를 자동으로 계산하여 배치합니다.
 * 
 * @example
 * ```html
 * <sd-dock-container>
 *   <sd-dock position="top" [size]="50">상단 패널</sd-dock>
 *   <sd-dock position="left" [size]="200">좌측 패널</sd-dock>
 *   <sd-dock position="right" [size]="200">우측 패널</sd-dock>
 *   <sd-dock position="bottom" [size]="50">하단 패널</sd-dock>
 *   <div>메인 컨텐츠</div>
 * </sd-dock-container>
 * ```
 */
@Component({
  selector: "sd-dock-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-dock-container {
        display: block;
        position: relative;
        height: 100%;
      }
    `,
  ],
  template: `
    <ng-content />
  `,
})
export class SdDockContainerControl {
  /** HTML 엘리먼트 참조 */
  #elRef = injectElementRef<HTMLElement>();

  /** 도킹 패널 컨트롤 목록 */
  dockControls = contentChildren(SdDockControl);

  /** 
   * 생성자
   * 
   * 도킹 패널들의 위치와 크기를 계산하고 스타일을 적용합니다.
   * - top, bottom, left, right 위치에 따라 패널 배치
   * - 각 패널의 크기에 맞춰 컨테이너 패딩 조정
   */
  constructor() {
    $effect(() => {
      let top = 0;
      let left = 0;
      let bottom = 0;
      let right = 0;
      for (const dockControl of this.dockControls()) {
        const position = dockControl.position();

        if (position === "top") {
          dockControl.assignStyle({
            top: top + "px",
            bottom: "",
            left: left + "px",
            right: right + "px",
          });
          top += dockControl.size();
        }
        else if (position === "bottom") {
          dockControl.assignStyle({
            top: "",
            bottom: bottom + "px",
            left: left + "px",
            right: right + "px",
          });
          bottom += dockControl.size();
        }
        else if (position === "left") {
          dockControl.assignStyle({
            top: top + "px",
            bottom: bottom + "px",
            left: left + "px",
            right: "",
          });
          left += dockControl.size();
        }
        else {
          dockControl.assignStyle({
            top: top + "px",
            bottom: bottom + "px",
            left: "",
            right: right + "px",
          });
          right += dockControl.size();
        }
      }

      Object.assign(this.#elRef.nativeElement.style, {
        paddingTop: top + "px",
        paddingBottom: bottom + "px",
        paddingRight: right + "px",
        paddingLeft: left + "px",
      });
    });
  }
}
