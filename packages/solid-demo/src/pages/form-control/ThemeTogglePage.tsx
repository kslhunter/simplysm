import { ThemeToggle, Topbar, Card, Alert } from "@simplysm/solid";

export default function ThemeTogglePage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">ThemeToggle</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Basic Usage */}
          <section>
            <h2 class="mb-4 text-xl font-bold">기본 사용법</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              ThemeToggle 버튼을 클릭하면 라이트 → 시스템 → 다크 순으로 테마가 전환됩니다.
            </p>
            <div class="flex items-center gap-4">
              <ThemeToggle />
              <span class="text-sm text-base-500">클릭하여 테마 변경</span>
            </div>
          </section>

          {/* Sizes */}
          <section>
            <h2 class="mb-4 text-xl font-bold">크기</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              size prop으로 버튼 크기를 조절할 수 있습니다.
            </p>
            <div class="flex items-center gap-6">
              <div class="flex flex-col items-center gap-2">
                <ThemeToggle size="sm" />
                <span class="text-xs text-base-500">sm</span>
              </div>
              <div class="flex flex-col items-center gap-2">
                <ThemeToggle />
                <span class="text-xs text-base-500">default</span>
              </div>
              <div class="flex flex-col items-center gap-2">
                <ThemeToggle size="lg" />
                <span class="text-xs text-base-500">lg</span>
              </div>
            </div>
          </section>

          {/* Theme Modes */}
          <section>
            <h2 class="mb-4 text-xl font-bold">테마 모드</h2>
            <div class="space-y-4">
              <Card>
                <div class="flex items-center gap-3 p-4">
                  <div class="flex size-10 items-center justify-center rounded bg-warning-100 text-warning-600 dark:bg-warning-900/30">
                    ☀️
                  </div>
                  <div>
                    <h3 class="font-bold">라이트 모드</h3>
                    <p class="text-sm text-base-500 dark:text-base-400">
                      밝은 배경에 어두운 텍스트
                    </p>
                  </div>
                </div>
              </Card>
              <Card>
                <div class="flex items-center gap-3 p-4">
                  <div class="flex size-10 items-center justify-center rounded bg-base-100 text-base-600 dark:bg-base-700">
                    💻
                  </div>
                  <div>
                    <h3 class="font-bold">시스템 설정</h3>
                    <p class="text-sm text-base-500 dark:text-base-400">OS 설정에 따라 자동 전환</p>
                  </div>
                </div>
              </Card>
              <Card>
                <div class="flex items-center gap-3 p-4">
                  <div class="flex size-10 items-center justify-center rounded bg-info-100 text-info-600 dark:bg-info-900/30">
                    🌙
                  </div>
                  <div>
                    <h3 class="font-bold">다크 모드</h3>
                    <p class="text-sm text-base-500 dark:text-base-400">
                      어두운 배경에 밝은 텍스트
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Usage Note */}
          <section>
            <h2 class="mb-4 text-xl font-bold">사용 시 참고사항</h2>
            <Alert theme="info">
              <p class="mb-2">
                <strong>ThemeProvider 필요:</strong> ThemeToggle은 ThemeProvider 컨텍스트 내에서
                사용해야 합니다.
              </p>
              <p>테마 설정은 localStorage에 저장되어 페이지를 새로고침해도 유지됩니다.</p>
            </Alert>
          </section>

          {/* In Header Example */}
          <section>
            <h2 class="mb-4 text-xl font-bold">헤더에서 사용 예시</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              ThemeToggle은 주로 사이드바나 헤더에 배치됩니다.
            </p>
            <Card>
              <div class="flex items-center justify-between border-b border-base-200 bg-base-50 px-4 py-3 dark:border-base-700 dark:bg-base-700/50">
                <span class="font-bold">My App</span>
                <ThemeToggle size="sm" />
              </div>
              <div class="p-4">
                <p class="text-base-600 dark:text-base-400">
                  헤더 우측에 ThemeToggle이 배치된 예시입니다.
                </p>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
