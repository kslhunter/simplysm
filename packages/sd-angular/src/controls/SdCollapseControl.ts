import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { $computed, $effect, $signal } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";

/**
 * `SdCollapseControl`은 콘텐츠를 접었다 펼 수 있는 Angular 컴포넌트입니다.
 * 
 * 이 컴포넌트는 다음과 같은 기능을 제공합니다:
 * - 콘텐츠의 부드러운 접기/펼치기 애니메이션
 * - 콘텐츠 크기 변경 감지 및 대응
 * - 상태에 따른 스타일 변경
 * 
 * @example
 * ```html
 * <sd-collapse [(open)]="isOpen">
 *   <div>접었다 펼칠 수 있는 콘텐츠</div>
 * </sd-collapse>
 * ```
 * 
 * @property open - 콘텐츠의 펼침 상태 (기본값: false)
 */
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
    "[attr.sd-open]": "open()",
  },
})
export class SdCollapseControl {
  /** 콘텐츠의 펼침 상태 (기본값: false) */
  open = input(false, { transform: transformBoolean });

  /** 콘텐츠 요소에 대한 참조 */
  contentElRef = viewChild.required<any, ElementRef<HTMLElement>>("contentEl", { read: ElementRef });

  /** 콘텐츠의 현재 높이 */
  contentHeight = $signal(0);

  /** 콘텐츠의 상단 여백 계산 (접힘 상태일 때 음수 높이 적용) */
  marginTop = $computed(() => (this.open() ? "" : -this.contentHeight() + "px"));

  constructor() {
    // 콘텐츠 높이 초기화 및 변경 감지
    $effect(() => {
      this.contentHeight.set(this.contentElRef().nativeElement.offsetHeight);
    });
  }

  /** 콘텐츠 크기가 변경될 때 높이 업데이트 */
  onContentResize() {
    this.contentHeight.set(this.contentElRef().nativeElement.offsetHeight);
  }
}
