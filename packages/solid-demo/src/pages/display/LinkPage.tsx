import { Link, Topbar } from "@simplysm/solid";

export default function LinkPage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Link</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Basic */}
          <section>
            <h2 class="mb-4 text-xl font-bold">기본 링크</h2>
            <p class="text-sm text-base-600 dark:text-base-400">
              텍스트 안에서 <Link href="https://example.com">인라인 링크</Link>를 사용할 수
              있습니다.
            </p>
          </section>

          {/* External link */}
          <section>
            <h2 class="mb-4 text-xl font-bold">외부 링크</h2>
            <p class="text-sm text-base-600 dark:text-base-400">
              target="_blank"로{" "}
              <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
                새 탭에서 열기
              </Link>
              를 지원합니다.
            </p>
          </section>

          {/* In paragraph */}
          <section>
            <h2 class="mb-4 text-xl font-bold">문단 내 사용</h2>
            <p class="text-sm leading-relaxed text-base-600 dark:text-base-400">
              이 라이브러리에 대한 자세한 내용은{" "}
              <Link href="https://github.com">GitHub 저장소</Link>를 참고하세요. 문제가 발생하면{" "}
              <Link href="https://github.com/issues">이슈 트래커</Link>에 보고해 주세요.
            </p>
          </section>

          {/* Custom styling */}
          <section>
            <h2 class="mb-4 text-xl font-bold">커스텀 스타일링</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              class prop으로 추가 스타일을 적용할 수 있습니다.
            </p>
            <div class="space-y-2">
              <div>
                <Link href="#" class="text-lg font-bold">
                  큰 링크
                </Link>
              </div>
              <div>
                <Link href="#" class="text-danger-600 dark:text-danger-400">
                  위험 색상 링크
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
