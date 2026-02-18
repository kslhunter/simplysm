import { createSignal } from "solid-js";
import { Pagination, Topbar } from "@simplysm/solid";

export default function PaginationPage() {
  const [page1, setPage1] = createSignal(1);
  const [pageSm, setPageSm] = createSignal(1);
  const [pageMd, setPageMd] = createSignal(1);
  const [pageLg, setPageLg] = createSignal(1);
  const [pageCustom, setPageCustom] = createSignal(1);
  const [pageDisabled, setPageDisabled] = createSignal(1);

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Pagination</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          <section>
            <h2 class="mb-4 text-xl font-bold">기본</h2>
            <p class="mb-2 text-sm text-base-500">page: {page1()}</p>
            <Pagination page={page1()} onPageChange={setPage1} totalPageCount={20} />
          </section>

          <section>
            <h2 class="mb-4 text-xl font-bold">Size</h2>
            <div class="space-y-4">
              <div>
                <p class="mb-2 text-sm text-base-500">sm (page: {pageSm()})</p>
                <Pagination
                  page={pageSm()}
                  onPageChange={setPageSm}
                  totalPageCount={20}
                  size="sm"
                />
              </div>
              <div>
                <p class="mb-2 text-sm text-base-500">기본 (page: {pageMd()})</p>
                <Pagination page={pageMd()} onPageChange={setPageMd} totalPageCount={20} />
              </div>
              <div>
                <p class="mb-2 text-sm text-base-500">lg (page: {pageLg()})</p>
                <Pagination
                  page={pageLg()}
                  onPageChange={setPageLg}
                  totalPageCount={20}
                  size="lg"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 class="mb-4 text-xl font-bold">displayPageCount 커스텀 (5개씩)</h2>
            <p class="mb-2 text-sm text-base-500">page: {pageCustom()}</p>
            <Pagination
              page={pageCustom()}
              onPageChange={setPageCustom}
              totalPageCount={25}
              displayPageCount={5}
            />
          </section>

          <section>
            <h2 class="mb-4 text-xl font-bold">Disabled (totalPageCount=0)</h2>
            <Pagination page={pageDisabled()} onPageChange={setPageDisabled} totalPageCount={0} />
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
