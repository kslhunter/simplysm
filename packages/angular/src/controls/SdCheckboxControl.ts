import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";

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
    @Input() value = false;
    @Output() valueChange: EventEmitter<boolean> = new EventEmitter<boolean>();
    @Input() disabled = false;

    get styleClass(): string[] {
        return [
            this.value ? "_checked" : "",
            this.disabled ? "_disabled" : ""
        ].filter(item => item);
    }

    onChange(event: Event): void {
        const element = event.target as HTMLInputElement;
        this.value = element.checked;
        this.valueChange.emit(element.checked);
    }
}