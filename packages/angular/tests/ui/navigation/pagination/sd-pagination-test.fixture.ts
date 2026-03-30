import { Component, signal } from "@angular/core";
import { SdPaginationControl } from "../../../../src/ui/navigation/pagination/sd-pagination.control";

@Component({
  selector: "sd-pagination-first-group-test",
  template: `<sd-pagination [totalPageCount]="20" [visiblePageCount]="10" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationFirstGroupTest {
  currentPage = signal(3);
}

@Component({
  selector: "sd-pagination-second-group-test",
  template: `<sd-pagination [totalPageCount]="20" [visiblePageCount]="10" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationSecondGroupTest {
  currentPage = signal(15);
}

@Component({
  selector: "sd-pagination-small-total-test",
  template: `<sd-pagination [totalPageCount]="5" [visiblePageCount]="10" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationSmallTotalTest {
  currentPage = signal(0);
}

@Component({
  selector: "sd-pagination-zero-total-test",
  template: `<sd-pagination [totalPageCount]="0" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationZeroTotalTest {
  currentPage = signal(0);
}

@Component({
  selector: "sd-pagination-current-page-highlight-test",
  template: `<sd-pagination [totalPageCount]="20" [visiblePageCount]="10" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationCurrentPageHighlightTest {
  currentPage = signal(3);
}

// --- Slice 2 fixtures ---

@Component({
  selector: "sd-pagination-nav-test",
  template: `<sd-pagination [totalPageCount]="20" [visiblePageCount]="10" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationNavTest {
  currentPage = signal(0);
}

@Component({
  selector: "sd-pagination-nav-first-group-test",
  template: `<sd-pagination [totalPageCount]="20" [visiblePageCount]="10" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationNavFirstGroupTest {
  currentPage = signal(3);
}

@Component({
  selector: "sd-pagination-nav-second-group-test",
  template: `<sd-pagination [totalPageCount]="20" [visiblePageCount]="10" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationNavSecondGroupTest {
  currentPage = signal(15);
}

@Component({
  selector: "sd-pagination-nav-middle-group-test",
  template: `<sd-pagination [totalPageCount]="30" [visiblePageCount]="10" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationNavMiddleGroupTest {
  currentPage = signal(15);
}

@Component({
  selector: "sd-pagination-nav-zero-total-test",
  template: `<sd-pagination [totalPageCount]="0" [(currentPage)]="currentPage" />`,
  standalone: true,
  imports: [SdPaginationControl],
})
export class SdPaginationNavZeroTotalTest {
  currentPage = signal(0);
}
