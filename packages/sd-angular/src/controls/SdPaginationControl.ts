import { ChangeDetectionStrategy, Component, inject, input, output, ViewEncapsulation } from "@angular/core";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { $computed, $model } from "../utils/$hooks";
import { SdIconControl } from "./SdIconControl";

/**
 * 페이지네이션 컨트롤
 *
 * 데이터 목록의 페이지를 이동할 수 있는 컨트롤을 제공합니다.
 *
 * @example
 *
 * <sd-pagination [page]="currentPage"
 *                [pageLength]="totalPages"
 *                [displayPageLength]="5"
 *                (pageChange)="onPageChange($event)">
 * </sd-pagination>
 *
 *
 * @remarks
 * - 첫 페이지, 이전 페이지, 다음 페이지, 마지막 페이지로 이동할 수 있는 버튼을 제공합니다.
 * - 현재 페이지를 중심으로 지정된 개수만큼의 페이지 번호를 표시합니다.
 * - 페이지 번호는 0부터 시작합니다.
 */
@Component({
  selector: "sd-pagination",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdAnchorControl, SdIconControl],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

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
      <sd-icon [icon]="icons.angleDoubleLeft" fixedWidth />
    </sd-anchor>
    <sd-anchor [disabled]="!hasPrev()" (click)="onPrevClick()">
      <sd-icon [icon]="icons.angleLeft" fixedWidth />
    </sd-anchor>
    @for (displayPage of displayPages(); track displayPage) {
      <sd-anchor (click)="onPageClick(displayPage)" [attr.sd-selected]="displayPage === page()">
        {{ displayPage + 1 }}
      </sd-anchor>
    }
    <sd-anchor [disabled]="!hasNext()" (click)="onNextClick()">
      <sd-icon [icon]="icons.angleRight" fixedWidth />
    </sd-anchor>
    <sd-anchor [disabled]="!hasNext()" (click)="onGoLastClick()">
      <sd-icon [icon]="icons.angleDoubleRight" fixedWidth />
    </sd-anchor>
  `,
})
export class SdPaginationControl {
  /** 아이콘 설정 */
  icons = inject(SdAngularConfigProvider).icons;

  /** 현재 페이지 번호 */
  _page = input<number>(0, { alias: "page" });
  /** 페이지 변경 이벤트 */
  _pageChange = output<number>({ alias: "pageChange" });
  /** 현재 페이지 모델 */
  page = $model(this._page, this._pageChange);

  /** 전체 페이지 수 */
  pageLength = input(0);
  /** 한번에 표시할 페이지 번호 개수 */
  displayPageLength = input(10);

  /** 화면에 표시할 페이지 번호 목록 */
  displayPages = $computed(() => {
    const pages: number[] = [];
    for (let i = 0; i < this.pageLength(); i++) {
      pages.push(i);
    }

    const from = Math.floor(this.page() / this.displayPageLength()) * this.displayPageLength();
    const to = Math.min(from + this.displayPageLength(), this.pageLength());
    return pages.filter((item) => item >= from && item < to);
  });

  /** 다음 페이지가 있는지 여부 */
  hasNext = $computed(() => {
    return (this.displayPages().last() ?? 0) < this.pageLength() - 1;
  });

  /** 이전 페이지가 있는지 여부 */
  hasPrev = $computed(() => {
    return (this.displayPages().first() ?? 0) > 0;
  });

  /** 특정 페이지로 이동 */
  onPageClick(page: number) {
    this.page.set(page);
  }

  /** 다음 페이지로 이동 */
  onNextClick() {
    const page = (this.displayPages().last() ?? 0) + 1;
    this.page.set(page);
  }

  /** 이전 페이지로 이동 */
  onPrevClick() {
    const page = (this.displayPages().first() ?? 0) - 1;
    this.page.set(page);
  }

  /** 첫 페이지로 이동 */
  onGoFirstClick() {
    const page = 0;
    this.page.set(page);
  }

  /** 마지막 페이지로 이동 */
  onGoLastClick() {
    const page = this.pageLength() - 1;
    this.page.set(page);
  }
}
