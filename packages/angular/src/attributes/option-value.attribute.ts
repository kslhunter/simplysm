import {Directive, HostBinding, Input} from "@angular/core";
import {JsonConvert} from "@simplism/core";

@Directive({
  selector: "option[value]" //tslint:disable-line:directive-selector
})
export class OptionValueAttribute {
  @Input()
  public value?: any;

  @HostBinding("attr.value")
  public get valueJson(): string {
    return JsonConvert.stringify(this.value);
  }
}