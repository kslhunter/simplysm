import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  numberAttribute,
  ViewEncapsulation,
} from "@angular/core";
import { SdAnchorControl } from "../../form/button/sd-anchor.control";
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
  template: `
    <sd-anchor class="nav-first" [disabled]="!hasPrev()" (click)="goToFirst()">
      <ng-icon [svg]="icons.tablerChevronsLeft" />
    </sd-anchor>
    <sd-anchor class="nav-prev-group" [disabled]="!hasPrev()" (click)="goToPrevGroup()">
      <ng-icon [svg]="icons.tablerChevronLeft" />
    </sd-anchor>

    @for (page of displayPages(); track page) {
      <sd-anchor
        class="page-anchor"
        [style.text-decoration]="page === currentPage() + 1 ? 'underline' : ''"
        (click)="goToPage(page - 1)"
      >{{ page }}</sd-anchor>
    }

    <sd-anchor class="nav-next-group" [disabled]="!hasNext()" (click)="goToNextGroup()">
      <ng-icon [svg]="icons.tablerChevronRight" />
    </sd-anchor>
    <sd-anchor class="nav-last" [disabled]="!hasNext()" (click)="goToLast()">
      <ng-icon [svg]="icons.tablerChevronsRight" />
    </sd-anchor>
  `,
  styles: [
    /* language=SCSS */ `
      sd-pagination {
        > sd-anchor {
          display: inline-block;
          padding: var(--gap-xs);
        }
      }
    `,
  ],
  host: {
    class: "flex-row gap-xs",
  },
})
export class SdPaginationControl {
  icons = { tablerChevronsLeft, tablerChevronLeft, tablerChevronRight, tablerChevronsRight };

  currentPage = model(0);
  totalPageCount = input(0, { transform: numberAttribute });
  visiblePageCount = input(10, { transform: numberAttribute });

  private readonly groupIndex = computed(() => {
    return Math.floor(this.currentPage() / Math.max(this.visiblePageCount(), 1));
  });

  hasPrev = computed(() => {
    if (this.totalPageCount() === 0) {
      return false;
    }
    return this.groupIndex() > 0;
  });

  hasNext = computed(() => {
    const totalPageCount = this.totalPageCount();
    if (totalPageCount === 0) {
      return false;
    }
    const lastGroupIndex = Math.floor((totalPageCount - 1) / Math.max(this.visiblePageCount(), 1));
    return this.groupIndex() < lastGroupIndex;
  });

  displayPages = computed(() => {
    const totalPageCount = this.totalPageCount();
    if (totalPageCount === 0) {
      return [] as number[];
    }

    const visiblePageCount = this.visiblePageCount();
    const startPage = this.groupIndex() * visiblePageCount + 1;
    const endPage = Math.min(startPage + visiblePageCount - 1, totalPageCount);

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  });

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  goToNextGroup(): void {
    this.currentPage.set((this.groupIndex() + 1) * this.visiblePageCount());
  }

  goToPrevGroup(): void {
    if (!this.hasPrev()) return;
    this.currentPage.set((this.groupIndex() - 1) * Math.max(this.visiblePageCount(), 1));
  }

  goToFirst(): void {
    this.currentPage.set(0);
  }

  goToLast(): void {
    if (this.totalPageCount() === 0) return;
    this.currentPage.set(this.totalPageCount() - 1);
  }
}
