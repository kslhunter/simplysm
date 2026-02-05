import { Card, Topbar, TopbarContainer } from "@simplysm/solid";

export default function CardPage() {
  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Card</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Basic Card */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 카드</h2>
            <Card class="p-4">
              <p>기본 카드 컴포넌트입니다. 호버 시 그림자가 강조됩니다.</p>
            </Card>
          </section>

          {/* Card with Header */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">헤더가 있는 카드</h2>
            <Card class="overflow-hidden">
              <div class="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
                <h3 class="font-semibold">카드 제목</h3>
              </div>
              <div class="p-4">
                <p>카드 본문 내용입니다.</p>
              </div>
            </Card>
          </section>

          {/* Card Grid */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">카드 그리드</h2>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card class="p-4">
                <h3 class="mb-2 font-semibold">카드 1</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">첫 번째 카드 내용입니다.</p>
              </Card>
              <Card class="p-4">
                <h3 class="mb-2 font-semibold">카드 2</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">두 번째 카드 내용입니다.</p>
              </Card>
              <Card class="p-4">
                <h3 class="mb-2 font-semibold">카드 3</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">세 번째 카드 내용입니다.</p>
              </Card>
            </div>
          </section>

          {/* Interactive Card */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">인터랙티브 카드</h2>
            <Card class="cursor-pointer p-4 transition-transform hover:scale-[1.02]" onClick={() => alert("카드 클릭!")}>
              <h3 class="mb-2 font-semibold">클릭 가능한 카드</h3>
              <p class="text-sm text-slate-600 dark:text-slate-400">이 카드를 클릭하면 알림이 표시됩니다.</p>
            </Card>
          </section>

          {/* Card with Image */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">이미지 카드</h2>
            <Card class="max-w-sm overflow-hidden">
              <div class="h-40 bg-gradient-to-br from-primary-400 to-primary-600" />
              <div class="p-4">
                <h3 class="mb-2 font-semibold">이미지가 있는 카드</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  상단에 이미지 영역이 있는 카드 레이아웃입니다.
                </p>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
