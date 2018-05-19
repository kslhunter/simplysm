import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";
import {animate, state, style, transition, trigger} from "@angular/animations";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label>
      <input [checked]="value" (change)="onValueChange($event)" type="checkbox" hidden>
      <div class="_rect"></div>
      <sd-icon class="_indicator" [icon]="'check'" [fixedWidth]="true"
               [@iconState]="value ? 'check' : 'uncheck'"></sd-icon>
      <div class="_content">
        <ng-content></ng-content>
      </div>
    </label>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host > label {
      @include form-control-base();
      cursor: pointer;
      position: relative;

      > ._rect {
        position: absolute;
        display: block;
        width: $line-height;
        height: $line-height;
        border: 1px solid trans-color(default);
        background: trans-color(default);
      }

      > ._indicator {
        opacity: 0;
      }

      > ._content {
        display: inline-block;
        text-indent: gap(xs);
      }
    }
  `],
  animations: [
    trigger("iconState", [
      state("uncheck", style({opacity: 0})),
      state("check", style({opacity: 1})),
      transition("check <=> uncheck", animate(".1s linear")),
    ])
  ]
})
export class SdCheckboxControl {
  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  public value = false;

  @Output()
  public readonly valueChange = new EventEmitter<boolean>();

  public onValueChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.value = el.checked;
    this.valueChange.emit(this.value);
  }
}