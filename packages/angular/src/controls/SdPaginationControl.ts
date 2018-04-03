import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
    selector: "sd-pagination",
    template: `
        <a *ngIf="hasPrev" (click)="goPrev()">
            <i class="fas fa-fw fa-angle-double-left"></i>
        </a>
        <a *ngFor="let page of cursorPages" (click)="valueChange.emit(page)" [class._selected]="page === value">
            {{page + 1}}
        </a>
        <a *ngIf="hasNext" (click)="goNext()">
            <i class="fas fa-fw fa-angle-double-right"></i>
        </a>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdPaginationControl {
    @Input() value = 0;
    @Output() valueChange = new EventEmitter<number>();
    @Input() length = 0;

    get pages(): number[] {
        const result = [];
        for (let i = 0; i < this.length; i++) {
            result.push(i);
        }
        return result;
    }

    get cursorPages(): number[] {
        const from = Math.floor(this.value / 10) * 10;
        const to = Math.min(from + 10, this.length);
        return this.pages.filter(item => item >= from && item < to);
    }

    get hasNext(): boolean {
        return (this.cursorPages.lastOr(0)) < (this.length - 1);
    }

    get hasPrev(): boolean {
        return this.cursorPages.firstOr(0) > 0;
    }

    goNext(): void {
        this.valueChange.emit(this.cursorPages.lastOr(0) + 1);
    }

    goPrev(): void {
        this.valueChange.emit(this.cursorPages.firstOr(0) - 1);
    }

    constructor() {
    }
}