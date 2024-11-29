import { ChangeDetectionStrategy, Component, HostListener, inject, input, ViewEncapsulation } from "@angular/core";
import { SdBusyProvider } from "../providers/SdBusyProvider";
import { $computed } from "../utils/$hooks";
import { transformBoolean, transformNullableBoolean } from "../utils/transforms";

/**
 * 로딩 컨테이너 컴포넌트
 * 
 * 콘텐츠 영역에 로딩 상태를 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-busy-container [busy]="isLoading">
 *   콘텐츠 영역
 * </sd-busy-container>
 * 
 * <!-- 로딩 메시지 표시 -->
 * <sd-busy-container 
 *   [busy]="isLoading"
 *   message="데이터를 불러오는 중...">
 *   콘텐츠 영역
 * </sd-busy-container>
 * 
 * <!-- 진행률 표시 -->
 * <sd-busy-container
 *   [busy]="isLoading"
 *   [progressPercent]="loadingProgress">
 *   콘텐츠 영역
 * </sd-busy-container>
 * ```
 * 
 * @remarks
 * - 콘텐츠 영역 위에 반투명 오버레이를 표시합니다
 * - 로딩 인디케이터 애니메이션을 제공합니다
 * - 선택적으로 로딩 메시지를 표시할 수 있습니다
 * - 진행률 표시 기능을 지원합니다
 * - 로딩 상태가 아닐 때는 오버레이가 표시되지 않습니다
 * - 최소 70x70px의 크기가 필요합니다
 */
@Component({
  selector: "sd-busy-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div class="_screen">
      <div class="_rect">
        <!--<div class="_bar"></div>-->
        <div class="_indicator">
          <div class="_cube1"></div>
          <div class="_cube2"></div>
          <div class="_cube4"></div>
          <div class="_cube3"></div>
        </div>
        @if (message()) {
          <div class="_message">
            <pre>{{ message() }}</pre>
          </div>
        }
      </div>
      @if (progressPercent() != null) {
        <div class="_progress">
          <div class="_progress-bar" [style.transform]="'scaleX(' + progressPercent()! / 100 + ')'"></div>
        </div>
      }
    </div>
    <ng-content></ng-content>
  `,
  //region styles
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-busy-container {
        display: block;
        position: relative;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        min-width: 70px;
        min-height: 70px;
        overflow: auto;

        > ._screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: var(--z-index-busy);

          visibility: hidden;
          pointer-events: none;

          background: rgba(255, 255, 255, 0.3);
          //backdrop-filter: none;
          opacity: 0;
          transition: opacity calc(var(--animation-duration) * 2);
          /*transition:
            opacity 0.3s,
            backdrop-filter 5s;*/
          transition-timing-function: linear;

          > ._progress {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            height: 4px;
            width: 100%;
            background-color: white;

            > ._progress-bar {
              position: absolute;
              top: 0;
              left: 0;
              display: inline-block;
              content: "";
              height: 4px;
              width: 100%;
              transition: 0.1s ease-in;
              transition-property: transform;
              transform-origin: left;
              transform: scaleX(0);
              background-color: var(--theme-primary-default);
            }
          }
        }

        &[sd-busy="true"] {
          > ._screen {
            visibility: visible;
            pointer-events: auto;

            opacity: 1;
            //backdrop-filter: blur(10px);
          }
        }

        &[sd-no-fade="true"] {
          > ._screen {
            background: rgba(255, 255, 255, 0);
            //backdrop-filter: none !important;
          }
        }

        &[sd-type="spinner"] {
          > ._screen > ._rect {
            transform: translateY(-100%);
            transition: 0.1s ease-in;
            transition-property: transform;

            > ._indicator {
              top: 0;
              width: 30px;
              height: 30px;
              margin: 20px auto 0 auto;
              border: 6px solid white;
              border-radius: 100%;
              border-bottom-color: var(--theme-primary-default);
              animation: sd-busy-spin 1s linear infinite;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

              > div {
                display: none;
              }
            }

            > ._message {
              position: absolute;
              top: 55px;
              width: 100%;
              color: white;
              font-weight: bold;
              text-align: center;
              text-shadow: 0 0 2px black;
            }
          }

          &[sd-busy="true"] {
            > ._screen > ._rect {
              transform: none;
              transition: 0.1s ease-out;
            }
          }
        }

        &[sd-type="bar"] {
          min-height: 4px;

          &[sd-busy="true"] {
            > ._screen > ._rect {
              > ._indicator {
                position: absolute;
                top: 0;
                left: 0;
                height: 4px;
                width: 100%;
                background-color: white;

                &:before,
                &:after {
                  position: absolute;
                  top: 0;
                  left: 0;
                  display: inline-block;
                  content: "";
                  height: 4px;
                  width: 100%;

                  transform-origin: left;
                }

                &:before {
                  background-color: var(--theme-primary-default);
                  animation: sd-busy-bar-indicator-before 2s infinite ease-in;
                }

                &:after {
                  background-color: white;
                  animation: sd-busy-bar-indicator-after 2s infinite ease-out;
                }

                > div {
                  display: none;
                }
              }

              > ._message {
                position: absolute;
                top: 4px;
                right: 0;
                display: inline-block;
              }
            }
          }
        }

        &[sd-type="cube"] {
          > ._screen > ._rect {
            /*> ._bar {
            &:before,
            &:after {
              position: absolute;
              top: 0;
              left: 0;
              display: inline-block;
              content: "";
              height: 4px;
              width: 100%;

              transform-origin: left;
            }

            &:before {
              background-color: var(--theme-primary-default);
              animation: sd-busy-bar-indicator-before 2s infinite ease-in;
            }

            &:after {
              background-color: white;
              animation: sd-busy-bar-indicator-after 2s infinite ease-out;
            }
          }*/

            > ._indicator {
              position: absolute;
              top: calc(50% - 20px);
              left: calc(50% - 20px);
              width: 40px;
              height: 40px;
              transform: rotateZ(45deg);

              ._cube1,
              ._cube2,
              ._cube3,
              ._cube4 {
                float: left;
                width: 50%;
                height: 50%;
                position: relative;

                &:before {
                  content: "";
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background-color: var(--trans-light);
                  animation: sd-busy-cube 2.4s infinite linear both;
                  transform-origin: 100% 100%;
                }
              }

              ._cube2 {
                transform: rotateZ(90deg);

                &:before {
                  animation-delay: 0.3s;
                }
              }

              ._cube3 {
                transform: rotateZ(180deg);

                &:before {
                  animation-delay: 0.6s;
                }
              }

              ._cube4 {
                transform: rotateZ(270deg);

                &:before {
                  animation-delay: 0.9s;
                }
              }
            }

            > ._message {
              position: absolute;
              top: 4px;
              right: 0;
              display: inline-block;
            }
          }
        }
      }

      @keyframes sd-busy-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes sd-busy-bar-indicator-before {
        0% {
          transform: scaleX(0);
        }
        60%,
        100% {
          transform: scaleX(1);
        }
      }

      @keyframes sd-busy-bar-indicator-after {
        0%,
        50% {
          transform: scaleX(0);
        }
        100% {
          transform: scaleX(1);
        }
      }

      @keyframes sd-busy-cube {
        0%,
        10% {
          transform: perspective(140px) rotateX(-180deg);
          opacity: 0;
        }
        25%,
        75% {
          transform: perspective(140px) rotateX(0deg);
          opacity: 1;
        }
        90%,
        100% {
          transform: perspective(140px) rotateY(180deg);
          opacity: 0;
        }
      }
    `,
  ],
  //endregion
  host: {
    "[attr.sd-busy]": "busy()",
    "[attr.sd-type]": "currType()",
    "[attr.sd-no-fade]": "currNoFade()",
  },
})
export class SdBusyContainerControl {
  #sdBusy = inject(SdBusyProvider);

  /** 로딩 상태 여부 */
  busy = input(false, { transform: transformBoolean });

  /** 로딩 중 표시할 메시지 */
  message = input<string>();

  /** 
   * 로딩 인디케이터 타입
   * - spinner: 회전하는 스피너 
   * - bar: 진행 바
   * - cube: 3D 큐브 애니메이션
   */
  type = input<"spinner" | "bar" | "cube">();

  /** 페이드 효과 비활성화 여부 */
  noFade = input(undefined, { transform: transformNullableBoolean });

  /** 진행률 표시 (0-100) */
  progressPercent = input<number>();

  currType = $computed(() => this.type() ?? this.#sdBusy.type());
  currNoFade = $computed(() => this.noFade() ?? this.#sdBusy.noFade());

  @HostListener("keydown.capture", ["$event"])
  onKeydownCapture(event: KeyboardEvent) {
    if (this.busy()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
