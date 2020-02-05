import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";


@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `    
    <ng-container *ngIf="length > 0">
      <a [disabled]="!hasPrev" (click)="onPrevClick()">
        <sd-icon [icon]="'angle-double-left'" [fixedWidth]="true"></sd-icon>
      </a>
      <a *ngFor="let displayPage of displayPages; trackBy: trackByPageFn" (click)="onPageClick(displayPage)"
         [attr.sd-selected]="displayPage === page">
        {{ displayPage + 1 }}
      </a>
      <a class="_next" [disabled]="!hasNext" (click)="onNextClick()">
        <sd-icon [icon]="'angle-double-right'" [fixedWidth]="true"></sd-icon>
      </a>
    </ng-container>`
})
export class SdPaginationControl {
  @Input()
  @SdTypeValidate({
    type: Number,
    notnull: true
  })
  public page = 0;

  @Input()
  @SdTypeValidate({
    type: Number,
    notnull: true
  })
  public length = 0;

  @Input()
  @SdTypeValidate({
    type: Number,
    notnull: true
  })
  public displayPageLength = 10;

  @Output()
  public readonly pageChange = new EventEmitter<number>();

  public get displayPages(): number[] {
    const pages = [];
    for (let i = 0; i < this.length; i++) {
      pages.push(i);
    }

    const from = Math.floor(this.page / this.displayPageLength) * this.displayPageLength;
    const to = Math.min(from + this.displayPageLength, this.length);
    return pages.filter(item => item >= from && item < to);
  }

  public get hasNext(): boolean {
    return (this.displayPages.last() || 0) < (this.length - 1);
  }

  public get hasPrev(): boolean {
    return (this.displayPages[0] || 0) > 0;
  }

  public trackByPageFn(index: number, value: number): number {
    return value;
  }

  public onPageClick(page: number): void {
    this.page = page;
    this.pageChange.emit(this.page);
  }

  public onNextClick(): void {
    if (!this.hasNext) return;

    this.page = (this.displayPages.last() || 0) + 1;
    this.pageChange.emit(this.page);
  }

  public onPrevClick(): void {
    if (!this.hasPrev) return;

    this.page = (this.displayPages[0] || 0) - 1;
    this.pageChange.emit(this.page);
  }
}