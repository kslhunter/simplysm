import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { $computed, $effect, $signal } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";

/**
 * 접을 수 있는 콘텐츠를 제공하는 컴포넌트
 * 
 * 콘텐츠를 접었다 펼 수 있는 애니메이션 효과를 제공하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-collapse [(open)]="isOpen">
 *   <div>접었다 펼칠 수 있는 콘텐츠</div>
 * </sd-collapse>
 * 
 * <!-- 초기 상태를 펼침으로 설정 -->
 * <sd-collapse [open]="true">
 *   <div>처음부터 펼쳐진 콘텐츠</div>
 * </sd-collapse>
 * ```
 * 
 * @remarks
 * - 부드러운 애니메이션 효과로 콘텐츠를 접고 펼칠 수 있습니다
 * - 콘텐츠의 높이를 자동으로 계산하여 적용합니다
 * - 콘텐츠 크기가 변경될 때 자동으로 높이를 조정합니다
 * - 양방향 바인딩을 지원합니다
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
