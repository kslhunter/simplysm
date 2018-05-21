import {ChangeDetectionStrategy, Component, ContentChildren, HostBinding, Input, QueryList} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {SdListControl} from "./sd-list.control";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label (click)="onLabelClick()">
      <ng-content></ng-content>
      <sd-icon [icon]="'angle-left'" *ngIf="hasChildren"></sd-icon>
    </label>
    <div [@childrenState]="open ? 'open' : 'close'">
      <ng-content select="sd-list"></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      > label {
        display: block;
        padding: gap(sm) gap(default);
        cursor: pointer;

        > sd-icon {
          float: right;
          transition: transform .1s ease-in;
        }

        &:hover {
          background: trans-color(dark);
        }
      }

      &[sd-header=true] > label {
        cursor: default;
        background: transparent;
        padding: gap(xs) gap(default);
        color: text-color(darker);
      }

      > div {
        overflow: hidden;
      }

      &[sd-open=true] {
        > label > sd-icon {
          transform: rotate(-90deg);
          transition: transform .1s ease-out;
        }
      }
    }
  `],
  animations: [
    trigger("childrenState", [
      state("close", style({height: "0"})),
      state("open", style({height: "*"})),
      transition("close => open", animate(".1s ease-out")),
      transition("open => close", animate(".1s ease-in"))
    ])
  ]
})
export class SdListItemControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-header")
  public header?: boolean;

  @HostBinding("attr.sd-open")
  public open?: boolean;

  @ContentChildren(SdListControl)
  public listControls?: QueryList<SdListControl>;

  public get hasChildren(): boolean {
    return !!this.listControls && this.listControls.length > 0;
  }

  public onLabelClick(): void {
    this.open = !this.open;
  }
}