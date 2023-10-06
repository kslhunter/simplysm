import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  ViewChild
} from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { sdThemes, TSdTheme } from "../commons";

@Component({
  selector: "sd-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_sd-toast-block">
      <div class="_sd-toast-message">
        <ng-content></ng-content>
      </div>
      <div class="_sd-toast-progress" *ngIf="useProgress">
        <div #progressBar class="_sd-toast-progress-bar">
        </div>
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    @import "../../scss/variables-scss-arr";

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
          background: var(--theme-color-grey-default);
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

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] {
          > ._sd-toast-block {
            background: var(--theme-color-#{$color}-default);

            > ._sd-toast-progress {
              background: var(--theme-color-#{$color}-darker);

              > ._sd-toast-progress-bar {
                background: var(--theme-color-#{$color}-lighter);
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

      @media screen and (max-width: 520px) {
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
  `]
})
export class SdToastControl {
  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public useProgress?: boolean;

  public set progress(val: number) {
    if (this.progressBarElRef) {
      this.progressBarElRef.nativeElement.style.width = val + "%";
    }
  }

  public close = new EventEmitter<any>();

  @Input()
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: sdThemes
  })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme = "info";

  @ViewChild("progressBar", { static: false, read: ElementRef })
  public progressBarElRef?: ElementRef<HTMLDivElement>;
}
