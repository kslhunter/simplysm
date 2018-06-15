import {Directive, HostBinding, Input} from "@angular/core";
import {JsonConvert} from "@simplism/core";
import {ISdNotifyPropertyChange, SdNotifyPropertyChange} from "..";

@Directive({
  selector: "option[value]" //tslint:disable-line:directive-selector
})
export class OptionValueAttribute implements ISdNotifyPropertyChange {
  @Input()
  @SdNotifyPropertyChange()
  public value?: any;

  @HostBinding("attr.value")
  public valueJson?: string;

  public sdOnPropertyChange(propertyName: string, oldValue: any, newValue: any): void {
    if (propertyName === "value") {
      this.valueJson = JsonConvert.stringify(newValue);
    }
  }
}