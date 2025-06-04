import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { $computed } from "../utils/bindings/$computed";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdTablerIconControl } from "./tabler-icon/sd-tabler-icon.control";
import { taChevronsLeft } from "@simplysm/sd-tabler-icons/icons/ta-chevrons-left";
import { taChevronsRight } from "@simplysm/sd-tabler-icons/icons/ta-chevrons-right";
import { taChevronLeft } from "@simplysm/sd-tabler-icons/icons/ta-chevron-left";
import { taChevronRight } from "@simplysm/sd-tabler-icons/icons/ta-chevron-right";

@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdTablerIconControl],
  styles: [
    /* language=SCSS */ `
      @use "../scss/mixins";

      sd-pagination {
        display: flex;
        flex-direction: row;

        > sd-anchor {
          display: inline-block;
          padding: var(--gap-sm);

          &[sd-selected="true"] {
            text-decoration: underline;
          }
        }
      }
    `,
  ],
  template: `
    <sd-anchor [disabled]="!hasPrev()" (click)="onGoFirstClick()">
      <sd-tabler-icon [icon]="taChevronsLeft" />
    </sd-anchor>
    <sd-anchor [disabled]="!hasPrev()" (click)="onPrevClick()">
      <sd-tabler-icon [icon]="taChevronLeft" />
    </sd-anchor>
    @for (displayPage of displayPages(); track displayPage) {
      <sd-anchor
        (click)="onPageClick(displayPage)"
        [attr.sd-selected]="displayPage === currentPage()"
      >
        {{ displayPage + 1 }}
      </sd-anchor>
    }
    <sd-anchor [disabled]="!hasNext()" (click)="onNextClick()">
      <sd-tabler-icon [icon]="taChevronRight" />
    </sd-anchor>
    <sd-anchor [disabled]="!hasNext()" (click)="onGoLastClick()">
      <sd-tabler-icon [icon]="taChevronsRight" />
    </sd-anchor>
  `,
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

  protected readonly taChevronsLeft = taChevronsLeft;
  protected readonly taChevronsRight = taChevronsRight;
  protected readonly taChevronLeft = taChevronLeft;
  protected readonly taChevronRight = taChevronRight;
}
