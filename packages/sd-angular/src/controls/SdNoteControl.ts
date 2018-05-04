import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";

@Component({
  selector: "sd-note",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdNoteControl {
  @Input() public size = "default";
  @Input() public theme = "default";

  @HostBinding("class._size-sm") public sizeSm = () => this.size === "sm";
  @HostBinding("class._theme-primary") public themePrimary = () => this.theme === "primary";
  @HostBinding("class._theme-success") public themeSuccess = () => this.theme === "success";
  @HostBinding("class._theme-info") public themeInfo = () => this.theme === "info";
  @HostBinding("class._theme-warning") public themeWarning = () => this.theme === "warning";
  @HostBinding("class._theme-danger") public themeDanger = () => this.theme === "danger";
}
