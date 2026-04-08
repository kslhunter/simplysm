import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdBusyProvider, type SdBusyType } from "../../../core/providers/sd-busy.provider";

@Component({
  selector: "sd-busy-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  host: {
    "[attr.data-sd-busy]": "busy() || undefined",
    "[attr.data-sd-type]": "currType()",
  },
  template: `
    @if (busy()) {
      <div class="_screen">
        <div class="_rect">
          <div class="_indicator">
            @switch (currType()) {
              @case ("spinner") {
                <div class="_spinner"></div>
              }
              @case ("bar") {
                <div class="_bar"></div>
              }
              @case ("cube") {
                <div class="_cube">
                  <div class="_cube-face _cube-face-1"></div>
                  <div class="_cube-face _cube-face-2"></div>
                  <div class="_cube-face _cube-face-3"></div>
                  <div class="_cube-face _cube-face-4"></div>
                </div>
              }
            }
          </div>
          @if (message() !== undefined) {
            <div class="_message">{{ message() }}</div>
          }
          @if (progressPercent() !== undefined) {
            <div class="_progress">
              <div class="_progress-bar" [style.width.%]="progressPercent()"></div>
            </div>
          }
        </div>
      </div>
    }
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/variables";
      @use "sass:map";

      sd-busy-container {
        display: block;
        position: relative;

        > ._screen {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: map.get(variables.$vars, z-index, busy);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--busy-overlay-bg);

          > ._rect {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--gap-default);

            > ._indicator {
              > ._spinner {
                width: 2rem;
                height: 2rem;
                border: 0.1667rem solid var(--theme-primary-lighter);
                border-top-color: var(--theme-primary-default);
                border-radius: 50%;
                animation: sd-busy-spin 0.8s linear infinite;
              }

              > ._bar {
                width: 6rem;
                height: 0.25rem;
                background: var(--theme-primary-lighter);
                border-radius: var(--border-radius-default);
                overflow: hidden;
                position: relative;

                &::after {
                  content: "";
                  position: absolute;
                  top: 0;
                  left: 0;
                  height: 100%;
                  width: 40%;
                  background: var(--theme-primary-default);
                  border-radius: var(--border-radius-default);
                  animation: sd-busy-bar 1.5s ease-in-out infinite;
                }
              }

              > ._cube {
                width: 2rem;
                height: 2rem;
                position: relative;
                animation: sd-busy-cube-rotate 1.8s infinite ease-in-out;

                > ._cube-face {
                  position: absolute;
                  width: 50%;
                  height: 50%;
                  background: var(--theme-primary-default);
                  animation: sd-busy-cube-fold 1.8s infinite ease-in-out;

                  &._cube-face-1 {
                    top: 0;
                    left: 0;
                  }

                  &._cube-face-2 {
                    top: 0;
                    right: 0;
                    animation-delay: 0.45s;
                  }

                  &._cube-face-3 {
                    bottom: 0;
                    right: 0;
                    animation-delay: 0.9s;
                  }

                  &._cube-face-4 {
                    bottom: 0;
                    left: 0;
                    animation-delay: 1.35s;
                  }
                }
              }
            }

            > ._message {
              font-size: var(--font-size-sm);
              color: var(--text-trans-light);
              text-align: center;
            }

            > ._progress {
              width: 10rem;
              height: 0.25rem;
              background: var(--theme-primary-lighter);
              border-radius: var(--border-radius-default);
              overflow: hidden;

              > ._progress-bar {
                height: 100%;
                background: var(--theme-primary-default);
                transition: width 0.3s ease;
              }
            }
          }
        }
      }

      @keyframes sd-busy-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes sd-busy-bar {
        0% {
          left: -40%;
        }
        100% {
          left: 100%;
        }
      }

      @keyframes sd-busy-cube-rotate {
        0% {
          transform: perspective(6.25rem) rotateX(0deg) rotateY(0deg);
        }
        50% {
          transform: perspective(6.25rem) rotateX(-180deg) rotateY(0deg);
        }
        100% {
          transform: perspective(6.25rem) rotateX(-180deg) rotateY(-180deg);
        }
      }

      @keyframes sd-busy-cube-fold {
        0%,
        10% {
          transform: scale(1);
        }
        25% {
          transform: scale(0.5);
        }
        50%,
        100% {
          transform: scale(1);
        }
      }
    `,
  ],
})
export class SdBusyContainer {
  private readonly _sdBusy = inject(SdBusyProvider);

  busy = input(false, { transform: booleanAttribute });
  message = input<string | undefined>(undefined);
  type = input<SdBusyType | undefined>(undefined);
  progressPercent = input<number | undefined>(undefined);

  currType = computed(() => this.type() ?? this._sdBusy.type());

  constructor() {
    const el = inject(ElementRef).nativeElement as HTMLElement;
    el.addEventListener(
      "keydown",
      (event) => {
        if (this.busy()) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );
  }
}
