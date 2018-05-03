import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from "@angular/core";

@Component({
  selector: "sd-checkbox",
  template: `
        <label [ngClass]="styleClass"
               tabindex="0">
            <input type="checkbox"
                   [checked]="value"
                   [disabled]="disabled"
                   (change)="onChange($event)"/>
            <ng-container *ngIf="contentWrapper.innerHTML.trim()">&nbsp;</ng-container>
            <span #contentWrapper><ng-content></ng-content></span>
        </label>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdCheckboxControl {
  @Input() public value = false;
  @Output() public readonly valueChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() public disabled = false;

  public get styleClass(): string[] {
    return [
      this.value ? "_checked" : "",
      this.disabled ? "_disabled" : ""
    ].filter((item) => item);
  }

  public onChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.value = element.checked;
    this.valueChange.emit(element.checked);
  }

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (event.key === " ") {
      this.value = !this.value;
      this.valueChange.emit(this.value);
    }
  }
}