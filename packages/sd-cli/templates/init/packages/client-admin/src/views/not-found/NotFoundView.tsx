import { A } from "@solidjs/router";

export function NotFoundView() {
  return (
    <div class="flex h-full items-center justify-center">
      <div class="rounded-lg border border-base-200 bg-base-50 p-8 text-center dark:border-base-700 dark:bg-base-800">
        <h1 class="mb-4 text-2xl font-bold">404</h1>
        <p class="mb-4 text-base-600 dark:text-base-400">페이지를 찾을 수 없습니다.</p>
        <A href="/home" class="text-primary-500 hover:underline">
          홈으로 돌아가기
        </A>
      </div>
    </div>
  );
}
