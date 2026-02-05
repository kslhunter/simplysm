import { A } from "@solidjs/router";

export function NotFoundPage() {
  return (
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
      <h1 class="mb-4 text-2xl font-bold">404</h1>
      <p class="mb-4 text-gray-600 dark:text-gray-400">페이지를 찾을 수 없습니다.</p>
      <A href="/home" class="text-primary-500 hover:underline">
        홈으로 돌아가기
      </A>
    </div>
  );
}
