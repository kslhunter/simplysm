import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { $computed } from "../../core/utils/bindings/$computed";
import { SdAnchorControl } from "../form/button/sd-anchor.control";
import { NgIcon } from "@ng-icons/core";
import {
  tablerChevronLeft,
  tablerChevronRight,
  tablerChevronsLeft,
  tablerChevronsRight,
} from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, NgIcon],
  host: {
    class: "flex-row gap-xs",
  },
  template: `
    <sd-anchor [disabled]="!hasPrev()" (click)="onGoFirstClick()">
      <ng-icon [svg]="tablerChevronsLeft" />
    </sd-anchor>
    <sd-anchor [disabled]="!hasPrev()" (click)="onPrevClick()">
      <ng-icon [svg]="tablerChevronLeft" />
    </sd-anchor>
    @for (displayPage of displayPages(); track displayPage) {
      <sd-anchor
        (click)="onPageClick(displayPage)"
        [class.tx-underline]="displayPage === currentPage()"
      >
        {{ displayPage + 1 }}
      </sd-anchor>
    }
    <sd-anchor [disabled]="!hasNext()" (click)="onNextClick()">
      <ng-icon [svg]="tablerChevronRight" />
    </sd-anchor>
    <sd-anchor [disabled]="!hasNext()" (click)="onGoLastClick()">
      <ng-icon [svg]="tablerChevronsRight" />
    </sd-anchor>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/mixins";

      sd-pagination {
        > sd-anchor {
          display: inline-block;
          padding: var(--gap-xs);
        }
      }
    `,
  ],
})
export class SdPaginationControl {
  currentPage = model<number>(0);

  totalPageCount = input(0);
  visiblePageCount = input(10);

  displayPages = $computed(() => {
    const pages: number[] = [];
    for (let i = 0; i < this.totalPageCount(); i++) {
      pages.push(i);
    }

    const from = Math.floor(this.currentPage() / this.visiblePageCount()) * this.visiblePageCount();
    const to = Math.min(from + this.visiblePageCount(), this.totalPageCount());
    return pages.filter((item) => item >= from && item < to);
  });

  hasNext = $computed(() => {
    return (this.displayPages().last() ?? 0) < this.totalPageCount() - 1;
  });

  hasPrev = $computed(() => {
    return (this.displayPages().first() ?? 0) > 0;
  });

  onPageClick(page: number) {
    this.currentPage.set(page);
  }

  onNextClick() {
    const page = (this.displayPages().last() ?? 0) + 1;
    this.currentPage.set(page);
  }

  onPrevClick() {
    const page = (this.displayPages().first() ?? 0) - 1;
    this.currentPage.set(page);
  }

  onGoFirstClick() {
    const page = 0;
    this.currentPage.set(page);
  }

  onGoLastClick() {
    const page = this.totalPageCount() - 1;
    this.currentPage.set(page);
  }

  protected readonly tablerChevronsLeft = tablerChevronsLeft;
  protected readonly tablerChevronLeft = tablerChevronLeft;
  protected readonly tablerChevronRight = tablerChevronRight;
  protected readonly tablerChevronsRight = tablerChevronsRight;
}
