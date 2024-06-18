import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, ViewChild} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <div class="_sd-toast-block">
      <div class="_sd-toast-message">
        <ng-content></ng-content>
      </div>
      @if (useProgress) {
        <div class="_sd-toast-progress">
          <div #progressBar class="_sd-toast-progress-bar">
          </div>
        </div>
      }
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";
    @import "../scss/variables";

    :host {
      display: block;
      margin-bottom: var(--gap-sm);
      text-align: center;
      width: 100%;
      pointer-events: none;

      > ._sd-toast-block {
        display: inline-block;
        text-align: left;
        color: white;
        transform: translateY(-100%);
        border-radius: var(--border-radius-lg);
        opacity: 0;
        @include elevation(12);
        pointer-events: auto;

        > ._sd-toast-message {
          padding: var(--gap-default) var(--gap-lg);
        }

        > ._sd-toast-progress {
          background: var(--theme-grey-default);
          height: 4px;
          border-radius: var(--border-radius-xl);
          margin: 0 4px 4px 4px;

          > ._sd-toast-progress-bar {
            border-radius: var(--border-radius-xl);
            height: 4px;
            transition: width 1s ease-out;
          }
        }
      }

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          > ._sd-toast-block {
            background: var(--theme-#{$key}-default);

            > ._sd-toast-progress {
              background: var(--theme-#{$key}-darker);

              > ._sd-toast-progress-bar {
                background: var(--theme-#{$key}-lighter);
              }
            }
          }
        }
      }

      &[sd-open=true] {
        > ._sd-toast-block {
          transform: none;
          transition: .1s ease-out;
          transition-property: transform, opacity;
          opacity: 1;
        }
      }

      &[sd-open=false] {
        > ._sd-toast-block {
          transform: translateY(-100%);
          transition: .1s ease-in;
          transition-property: transform, opacity;
          opacity: 0;
        }
      }

      @media all and (max-width: 520px) {
        > ._sd-toast-block {
          //@include elevation(0);
          border-radius: calc(var(--line-height) / 2);

          transform: translateY(100%);

          > ._sd-toast-message {
            padding: var(--gap-xs) var(--gap-default);
          }
        }

        &[sd-open=false] {
          > ._sd-toast-block {
            transform: translateY(100%);
          }
        }
      }
    }
  `],
  host: {
    "[attr.sd-open]": "open",
    "[attr.sd-theme]": "theme"
  }
})
export class SdToastControl {
  @Input({transform: coercionBoolean}) open = false;
  @Input({transform: coercionBoolean}) useProgress = false;
  @Input() theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey" = "info";

  @ViewChild("progressBar", {static: false, read: ElementRef}) progressBarElRef?: ElementRef<HTMLDivElement>;

  set progress(val: number) {
    if (this.progressBarElRef) {
      this.progressBarElRef.nativeElement.style.width = val + "%";
    }
  }

  close = new EventEmitter<any>();
}
