import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { IconDefinition } from "@fortawesome/fontawesome-common-types";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { icon, RotateProp, SizeProp } from "@fortawesome/fontawesome-svg-core";
import { injectElementRef } from "../utils/injectElementRef";
import { $effect } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";

/**
 * 아이콘 컨트롤
 * 
 * Font Awesome 아이콘을 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-icon [icon]="faUser"></sd-icon>
 * 
 * <!-- 크기 조절 -->
 * <sd-icon [icon]="faUser" size="2x"></sd-icon>
 * 
 * <!-- 회전 -->
 * <sd-icon [icon]="faUser" rotate="90"></sd-icon>
 * 
 * <!-- 고정 너비 -->
 * <sd-icon [icon]="faUser" [fixedWidth]="true"></sd-icon>
 * ```
 */
@Component({
  selector: "sd-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ``,
})
export class SdIconControl {
  /** 요소 참조 */
  #elRef = injectElementRef();
  /** 설정 제공자 */
  #sdNgConf = inject(SdAngularConfigProvider);

  /** 표시할 Font Awesome 아이콘 정의 */
  icon = input<IconDefinition>();
  
  /** 아이콘 크기 (xs, sm, lg, 2x 등) */
  size = input<SizeProp>();
  
  /** 아이콘 회전 각도 (90, 180, 270) */
  rotate = input<RotateProp>();
  
  /** 고정 너비 사용 여부 */
  fixedWidth = input(false, { transform: transformBoolean });
  
  /** 스택 아이템 크기 (1x 또는 2x) */
  stackItemSize = input<"1x" | "2x">();

  constructor() {
    /**
     * Font Awesome 아이콘을 렌더링하는 이펙트
     * 
     * 1. icon() 입력값이 없으면 기본 아이콘을 사용
     * 2. Font Awesome의 icon() 함수로 아이콘 렌더링
     * 3. 다음 클래스들을 적용:
     *    - fa-fw: 고정 너비 (fixedWidth가 true일 때)
     *    - fa-{size}: 아이콘 크기 (size 값이 있을 때)
     *    - fa-rotate-{angle}: 회전 각도 (rotate 값이 있을 때) 
     *    - fa-stack-{size}: 스택 아이템 크기 (stackItemSize 값이 있을 때)
     * 4. 렌더링된 SVG HTML을 요소에 삽입
     */
    $effect(() => {
      const iconDef = this.icon() ?? this.#sdNgConf.icons.fallback;
      const renderedIcon = icon(iconDef, {
        classes: [
          this.fixedWidth() ? "fa-fw" : undefined,
          this.size() != null ? `fa-${this.size()}` : undefined, 
          this.rotate() != null ? `fa-rotate-${this.rotate()}` : undefined,
          this.stackItemSize() != null ? `fa-stack-${this.stackItemSize()}` : undefined,
        ].filterExists(),
      });

      // SVG HTML 삽입
      this.#elRef.nativeElement.innerHTML = renderedIcon.html.join("\n");
    });
  }
}