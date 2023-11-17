import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  EventEmitter,
  inject,
  Injector,
  Input,
  Output
} from "@angular/core";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdIconControl} from "./SdIconControl";
import {coercionNumber} from "../utils/commons";
import {faAngleDoubleLeft, faAngleDoubleRight, faAngleLeft, faAngleRight} from "@fortawesome/pro-duotone-svg-icons";
import {SdNgHelper} from "../utils/SdNgHelper";
import {NgForOf} from "@angular/common";

@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [SdAnchorControl, SdIconControl, NgForOf],
  template: `
    <sd-anchor [disabled]="!hasPrev" (click)="onGoFirstClick()">
      <sd-icon [icon]="faAngleDoubleLeft" fixedWidth/>
    </sd-anchor>
    <sd-anchor [disabled]="!hasPrev" (click)="onPrevClick()">
      <sd-icon [icon]="faAngleLeft" fixedWidth/>
    </sd-anchor>
    <sd-anchor *ngFor="let displayPage of displayPages; trackBy: trackByFnForPage"
               (click)="onPageClick(displayPage)"
               [attr.sd-selected]="displayPage === page">
      {{ displayPage + 1 }}
    </sd-anchor>
    <sd-anchor [disabled]="!hasNext" (click)="onNextClick()">
      <sd-icon [icon]="faAngleRight" fixedWidth/>
    </sd-anchor>
    <sd-anchor [disabled]="!hasNext" (click)="onGoLastClick()">
      <sd-icon [icon]="faAngleDoubleRight" fixedWidth/>
    </sd-anchor>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      display: block;

      > sd-anchor {
        display: inline-block;
        padding: var(--gap-xs) var(--gap-sm);
        margin: var(--gap-xs);
        border-radius: var(--border-radius-sm);

        &[sd-selected=true] {
          text-decoration: underline;
        }

        body.sd-theme-modern &,
        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          @include active-effect(true);
        }

        &:hover {
          background: var(--theme-grey-lightest);
        }
      }
    }
  `]
})
export class SdPaginationControl implements DoCheck {
  @Input({transform: coercionNumber})
  page = 0;

  @Input({transform: coercionNumber})
  pageLength = 0;

  @Input({transform: coercionNumber})
  displayPageLength = 10;

  @Output()
  pageChange = new EventEmitter<number>();

  trackByFnForPage = (index: number, item: number): any => item;

  displayPages: number[] = [];
  hasNext = false;
  hasPrev = false;

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheck(run => {
      run({
        pageLength: [this.pageLength],
        page: [this.page],
        displayPageLength: [this.displayPageLength],
      }, () => {
        const pages: number[] = [];
        for (let i = 0; i < this.pageLength; i++) {
          pages.push(i);
        }

        const from = Math.floor(this.page / this.displayPageLength) * this.displayPageLength;
        const to = Math.min(from + this.displayPageLength, this.pageLength);
        this.displayPages = pages.filter((item) => item >= from && item < to);
      });

      run({
        displayPages: [this.displayPages],
        pageLength: [this.pageLength]
      }, () => {
        this.hasNext = (this.displayPages.last() ?? 0) < (this.pageLength - 1);
      });

      run({
        displayPages: [this.displayPages]
      }, () => {
        this.hasPrev = (this.displayPages[0] ?? 0) > 0;
      });
    });
  }

  onPageClick(page: number) {
    if (this.pageChange.observed) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  onNextClick() {
    const page = (this.displayPages.last() ?? 0) + 1;

    if (this.pageChange.observed) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  onPrevClick() {
    const page = (this.displayPages[0] ?? 0) - 1;

    if (this.pageChange.observed) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  onGoFirstClick() {
    const page = 0;

    if (this.pageChange.observed) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  onGoLastClick() {
    const page = this.pageLength - 1;

    if (this.pageChange.observed) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  protected readonly faAngleDoubleLeft = faAngleDoubleLeft;
  protected readonly faAngleLeft = faAngleLeft;
  protected readonly faAngleRight = faAngleRight;
  protected readonly faAngleDoubleRight = faAngleDoubleRight;
}
