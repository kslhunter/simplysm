import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { SdInputValidate } from "../../decorators/SdInputValidate";
import { faAngleDoubleLeft as fasAngleDoubleLeft } from "@fortawesome/pro-solid-svg-icons/faAngleDoubleLeft";
import { faAngleLeft as fasAngleLeft } from "@fortawesome/pro-solid-svg-icons/faAngleLeft";
import { faAngleRight as fasAngleRight } from "@fortawesome/pro-solid-svg-icons/faAngleRight";
import { faAngleDoubleRight as fasAngleDoubleRight } from "@fortawesome/pro-solid-svg-icons/faAngleDoubleRight";

@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-anchor *ngIf="hasPrev" (click)="onGoFirstClick()">
      <fa-icon [icon]="icons.fasAngleDoubleLeft" [fixedWidth]="true"></fa-icon>
    </sd-anchor>
    <sd-anchor *ngIf="hasPrev" (click)="onPrevClick()">
      <fa-icon [icon]="icons.fasAngleLeft" [fixedWidth]="true"></fa-icon>
    </sd-anchor>
    <sd-anchor *ngFor="let displayPage of displayPages; trackBy: trackByPageFn"
               (click)="onPageClick(displayPage)"
               [attr.sd-selected]="displayPage === page">
      {{ displayPage + 1 }}
    </sd-anchor>
    <sd-anchor *ngIf="hasNext" (click)="onNextClick()">
      <fa-icon [icon]="icons.fasAngleRight" [fixedWidth]="true"></fa-icon>
    </sd-anchor>
    <sd-anchor *ngIf="hasNext" (click)="onGoLastClick()">
      <fa-icon [icon]="icons.fasAngleDoubleRight" [fixedWidth]="true"></fa-icon>
    </sd-anchor>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;

      > sd-anchor {
        display: inline-block;
        padding: var(--gap-sm) var(--gap-default);

        &[sd-selected=true] {
          text-decoration: underline;
        }

        &:hover {
          background: var(--theme-color-grey-lightest);
        }
      }
    }
  `]
})
export class SdPaginationControl {
  public icons = {
    fasAngleDoubleLeft,
    fasAngleLeft,
    fasAngleRight,
    fasAngleDoubleRight
  };

  @Input()
  @SdInputValidate({
    type: Number,
    notnull: true
  })
  public page = 0;

  @Input()
  @SdInputValidate({
    type: Number,
    notnull: true
  })
  public pageLength = 0;

  @Input()
  @SdInputValidate({
    type: Number,
    notnull: true
  })
  public displayPageLength = 10;

  @Output()
  public readonly pageChange = new EventEmitter<number>();

  public trackByPageFn = (index: number, item: number): any => item;

  public get displayPages(): number[] {
    const pages: number[] = [];
    for (let i = 0; i < this.pageLength; i++) {
      pages.push(i);
    }

    const from = Math.floor(this.page / this.displayPageLength) * this.displayPageLength;
    const to = Math.min(from + this.displayPageLength, this.pageLength);
    return pages.filter((item) => item >= from && item < to);
  }

  public get hasNext(): boolean {
    return (this.displayPages.last() ?? 0) < (this.pageLength - 1);
  }

  public get hasPrev(): boolean {
    return (this.displayPages[0] ?? 0) > 0;
  }

  public onPageClick(page: number): void {
    if (this.pageChange.observers.length > 0) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  public onNextClick(): void {
    const page = (this.displayPages.last() ?? 0) + 1;

    if (this.pageChange.observers.length > 0) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  public onPrevClick(): void {
    const page = (this.displayPages[0] ?? 0) - 1;

    if (this.pageChange.observers.length > 0) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  public onGoFirstClick(): void {
    const page = 0;

    if (this.pageChange.observers.length > 0) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  public onGoLastClick(): void {
    const page = this.pageLength - 1;

    if (this.pageChange.observers.length > 0) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }
}
