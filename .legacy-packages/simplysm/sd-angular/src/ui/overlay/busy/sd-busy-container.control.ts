import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyProvider } from "./sd-busy.provider";
import { $computed } from "../../../core/utils/bindings/$computed";

import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";

@Component({
  selector: "sd-busy-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-busy]": "busy()",
    "[attr.data-sd-type]": "currType()",
    "(keydown.capture)": "onKeydownCapture($event)",
  },
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
          <div
            class="_progress-bar"
            [style.transform]="'scaleX(' + progressPercent()! / 100 + ')'"
          ></div>
        </div>
      }
    </div>
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

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

          // backdrop-filter: none;
          // transition: backdrop-filter calc(var(--animation-duration) * 10);

          // background: rgba(255, 255, 255, 0.1);
          opacity: 0;
          transition: opacity var(--animation-duration);

          transition-timing-function: linear;

          > ._progress {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            height: 4px;
            width: 100%;
            background-color: var(--background-color);

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

        &[data-sd-busy="true"] {
          > ._screen {
            visibility: visible;
            pointer-events: auto;

            opacity: 1;
          }
        }

        &[data-sd-type="spinner"] {
          > ._screen > ._rect {
            transform: translateY(-100%);
            transition: 0.1s ease-in;
            transition-property: transform;

            > ._indicator {
              top: 0;
              width: 30px;
              height: 30px;
              margin: 20px auto 0 auto;
              border: 6px solid var(--background-color);
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
              color: var(--background-color);
              font-weight: bold;
              text-align: center;
              text-shadow: 0 0 2px var(--background-rev-color);
            }
          }

          &[data-sd-busy="true"] {
            > ._screen > ._rect {
              transform: none;
              transition: 0.1s ease-out;
            }
          }
        }

        &[data-sd-type="bar"] {
          min-height: 4px;

          &[data-sd-busy="true"] {
            > ._screen > ._rect {
              > ._indicator {
                position: absolute;
                top: 0;
                left: 0;
                height: 4px;
                width: 100%;
                background-color: var(--background-color);

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
                  background-color: var(--background-color);
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

        &[data-sd-type="cube"] {
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
})
export class SdBusyContainerControl {
  private readonly _sdBusy = inject(SdBusyProvider);

  busy = input(false, { transform: transformBoolean });
  message = input<string>();
  type = input<"spinner" | "bar" | "cube">();
  progressPercent = input<number>();

  currType = $computed(() => this.type() ?? this._sdBusy.type());

  onKeydownCapture(event: KeyboardEvent) {
    if (this.busy()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
