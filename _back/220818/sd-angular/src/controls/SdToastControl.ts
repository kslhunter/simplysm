import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { sdThemes, TSdTheme } from "../commons";

@Component({
  selector: "sd-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_message">
      <ng-container *ngIf="message">
        {{ message }}
      </ng-container>
      <ng-container *ngIf="!message">
        <ng-content></ng-content>
      </ng-container>
    </div>
    <div class="_progress" *ngIf="progress !== undefined">
      <div class="_progress-bar" [style.width.%]="progress">
      </div>
    </div>
  `,
  styles: [/* language=SCSS */ `
    @import "../../scss/scss_settings";

    :host {
      display: inline-block;
      margin: var(--gap-xs) auto;
      pointer-events: auto;

      color: white;
      border-radius: var(--border-radius-lg);
      @include elevation(12);

      // MESSAGE
      > ._message {
        padding: var(--gap-default) var(--gap-lg);
      }

      // PROGRESS
      > ._progress {
        background: var(--theme-color-grey-default);
        height: var(--gap-sm);
        border-radius: var(--border-radius-lg);

        > ._progress-bar {
          height: var(--gap-sm);
          transition: width 1s ease-out;
        }
      }

      // THEME
      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] {
          background: var(--theme-color-#{$color}-default);

          > ._progress {
            > ._progress-bar {
              background: var(--theme-color-#{$color}-default);
            }
          }
        }
      }

      // OPEN-ANIMATION
      transform: translateY(-100%);
      transition: .1s ease-in;
      transition-property: transform, opacity;
      opacity: 0;

      &[sd-open=true] {
        transform: none;
        transition: .1s ease-out;
        opacity: 1;
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
  @SdInputValidate(String)
  public message?: string;

  @Input()
  @SdInputValidate({ type: String, includes: sdThemes })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme;

  @Input()
  @SdInputValidate(Number)
  public progress?: number;
}
