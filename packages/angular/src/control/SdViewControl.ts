import {ChangeDetectionStrategy, Component, Input} from "@angular/core";


@Component({
  selector: "sd-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdViewControl {


  @Input()
  public value?: any;


}