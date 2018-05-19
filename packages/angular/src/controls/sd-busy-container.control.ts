import {ChangeDetectionStrategy, Component, HostListener, Input} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";
import {animate, state, style, transition, trigger} from "@angular/animations";

@Component({
  selector: "sd-busy-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_" *ngIf="busy">
      <div [@indicatorState]="'on'">
        <div></div>
      </div>
    </div>
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: relative;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;

      > div:first-child {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, .6);
        z-index: $z-index-busy;

        > div > div {
          top: 0;
          width: 30px;
          height: 30px;
          margin: 20px auto 0 auto;
          border: 6px solid rgba(255, 255, 255, .5);
          border-radius: 100%;
          border-bottom-color: theme-color(primary, default);
          animation: _sd-busy-spin 1s linear infinite;
        }
      }
    }

    @keyframes _sd-busy-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `],
  animations: [
    trigger("indicatorState", [
      state("void", style({transform: "translateY(-100%)", opacity: "0"})),
      state("*", style({transform: "translateY(0)", opacity: "1"})),
      transition("void => *", animate(".1s ease-out"))
    ])
  ]
})
export class SdBusyContainerControl {
  @Input()
  @SdTypeValidate(Boolean)
  public busy?: boolean;

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (this.busy) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}