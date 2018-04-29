import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";

@Component({
    selector: "sd-pagination",
    template: `
        <a *ngIf="hasPrev" (click)="goPrev()">
            <sd-icon [icon]="'angle-double-left'" [fixedWidth]="true"></sd-icon>
        </a>
        <a *ngFor="let page of cursorPages; trackBy: pageTrackByFn" (click)="valueChange.emit(page)" [class._selected]="page === value">
            {{ page + 1 }}
        </a>
        <a *ngIf="hasNext" (click)="goNext()">
            <sd-icon [icon]="'angle-double-right'" [fixedWidth]="true"></sd-icon>
        </a>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdPaginationControl {
    @Input() public value = 0;
    @Output() public readonly valueChange = new EventEmitter<number>();
    @Input() public length = 0;

    public pageTrackByFn(value: number): number {
        return value;
    }

    public get pages(): number[] {
        const result = [];
        for (let i = 0; i < this.length; i++) {
            result.push(i);
        }
        return result;
    }

    public get cursorPages(): number[] {
        const from = Math.floor(this.value / 10) * 10;
        const to = Math.min(from + 10, this.length);
        return this.pages.filter((item) => item >= from && item < to);
    }

    public get hasNext(): boolean {
        return (this.cursorPages.last() || 0) < (this.length - 1);
    }

    public get hasPrev(): boolean {
        return (this.cursorPages[0] || 0) > 0;
    }

    public goNext(): void {
        this.valueChange.emit((this.cursorPages.last() || 0) + 1);
    }

    public goPrev(): void {
        this.valueChange.emit((this.cursorPages[0] || 0) - 1);
    }

    public constructor() {
    }
}