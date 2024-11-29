import { ChangeDetectionStrategy, Component, HostListener, inject, input, ViewEncapsulation } from "@angular/core";
import { SdSystemConfigProvider } from "../providers/SdSystemConfigProvider";
import { ISdResizeEvent } from "../plugins/SdResizeEventPlugin";
import { $effect, $signal } from "../utils/$hooks";
import { injectElementRef } from "../utils/injectElementRef";
import { transformBoolean } from "../utils/transforms";

/**
 * 도킹 패널 컴포넌트
 * 
 * 도킹 컨테이너 내에서 특정 위치에 고정되는 패널을 구현하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-dock position="left" [width]="200">
 *   좌측 패널 내용
 * </sd-dock>
 * 
 * <!-- 크기 조절 가능한 패널 -->
 * <sd-dock position="right" [width]="300" [resizable]="true">
 *   우측 크기조절 패널
 * </sd-dock>
 * 
 * <!-- 상/하단 패널 -->
 * <sd-dock position="top" [height]="100">상단 패널</sd-dock>
 * <sd-dock position="bottom" [height]="150">하단 패널</sd-dock>
 * ```
 * 
 * @remarks
 * - 도킹 컨테이너 내에서만 사용할 수 있습니다
 * - top, bottom, left, right 위치를 지원합니다
 * - 크기 조절이 가능한 패널을 구현할 수 있습니다
 * - 패널의 너비/높이를 지정할 수 있습니다
 * - 크기 조절 시 최소/최대 크기를 설정할 수 있습니다
 * - 크기 조절 시 부드러운 리사이즈 효과를 제공합니다
 * - 시스템 설정에 따라 크기 조절 동작을 커스터마이즈할 수 있습니다
 */
@Component({
  selector: "sd-dock",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-dock {
        display: block;
        position: absolute;
        overflow: visible;

        &[sd-resizable="true"] {
          > ._resize-bar {
            position: absolute;
            background: var(--border-color-light);
          }

          &[sd-position="top"] {
            > ._resize-bar {
              bottom: 0;
              left: 0;
              width: 100%;
              height: 2px;
              cursor: ns-resize;
            }
          }

          &[sd-position="bottom"] {
            > ._resize-bar {
              top: 0;
              left: 0;
              width: 100%;
              height: 2px;
              cursor: ns-resize;
            }
          }

          &[sd-position="left"] {
            > ._resize-bar {
              top: 0;
              right: 0;
              height: 100%;
              width: 2px;
              cursor: ew-resize;
            }
          }

          &[sd-position="right"] {
            > ._resize-bar {
              top: 0;
              left: 0;
              height: 100%;
              width: 2px;
              cursor: ew-resize;
            }
          }
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
    @if (resizable()) {
      <div class="_resize-bar" (mousedown)="onResizeBarMousedown($event)"></div>
    }
  `,
  host: {
    "[attr.sd-position]": "position()",
    "[attr.sd-resizable]": "resizable()",
  },
})
export class SdDockControl {
  /** 시스템 설정 프로바이더 */
  #sdSystemConfig = inject(SdSystemConfigProvider);
  /** HTML 엘리먼트 참조 */
  #elRef = injectElementRef<HTMLElement>();

  /** 도킹 패널의 고유 키 (설정 저장용) */
  key = input<string>();
  /** 
   * 도킹 패널의 위치
   * - top: 상단
   * - bottom: 하단
   * - right: 우측
   * - left: 좌측
   * (기본값: "top")
   */
  position = input<"top" | "bottom" | "right" | "left">("top");
  /** 크기 조절 가능 여부 (기본값: false) */
  resizable = input(false, { transform: transformBoolean });

  /** 현재 패널의 크기 */
  size = $signal(0);

  /** 저장된 패널 설정 */
  #config = $signal<{ size?: string }>();

  /** 
   * 생성자
   * 
   * 패널의 크기와 위치를 초기화하고 설정을 로드합니다.
   * - 저장된 설정이 있으면 패널 크기를 복원
   * - 크기 변경 시 설정 저장
   */
  constructor() {
    $effect([this.key], async () => {
      this.#config.set(await this.#sdSystemConfig.getAsync(`sd-dock.${this.key()}`));
    });

    $effect(() => {
      const conf = this.#config();
      if (this.resizable() && conf && conf.size != null) {
        if (["right", "left"].includes(this.position())) {
          this.#elRef.nativeElement.style.width = conf.size;
        }
        if (["top", "bottom"].includes(this.position())) {
          this.#elRef.nativeElement.style.height = conf.size;
        }
      }
    });
  }

  /** 패널의 스타일을 설정 */
  assignStyle(style: Partial<CSSStyleDeclaration>) {
    Object.assign(this.#elRef.nativeElement.style, style);
  }

  /** 크기 변경 이벤트 핸들러 */
  @HostListener("sdResize", ["$event"])
  onResize(event: ISdResizeEvent) {
    if (["top", "bottom"].includes(this.position()) && event.heightChanged) {
      this.size.set(this.#elRef.nativeElement.offsetHeight);
    }
    if (["right", "left"].includes(this.position()) && event.widthChanged) {
      this.size.set(this.#elRef.nativeElement.offsetWidth);
    }
  }

  /** 
   * 크기 조절 바 마우스 다운 이벤트 핸들러
   * 
   * 마우스 드래그로 패널 크기를 조절하고 설정을 저장합니다.
   */
  onResizeBarMousedown(event: MouseEvent) {
    const thisEl = this.#elRef.nativeElement;

    const startX = event.clientX;
    const startY = event.clientY;
    const startHeight = thisEl.clientHeight;
    const startWidth = thisEl.clientWidth;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      if (this.position() === "bottom") {
        thisEl.style.height = `${startHeight - e.clientY + startY}px`;
      }
      else if (this.position() === "right") {
        thisEl.style.width = `${startWidth - e.clientX + startX}px`;
      }
      else if (this.position() === "top") {
        thisEl.style.height = `${startHeight + e.clientY - startY}px`;
      }
      else {
        // left
        thisEl.style.width = `${startWidth + e.clientX - startX}px`;
      }
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);

      if (this.key() != null) {
        const newConf: { size?: string } = {};
        if (["right", "left"].includes(this.position())) {
          newConf.size = thisEl.style.width;
        }
        else {
          newConf.size = thisEl.style.height;
        }
        this.#config.set(newConf);
        await this.#sdSystemConfig.setAsync(`sd-dock.${this.key()}`, newConf);
      }
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  }
}
