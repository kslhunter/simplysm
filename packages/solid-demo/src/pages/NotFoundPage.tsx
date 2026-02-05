import { A } from "@solidjs/router";

export function NotFoundPage() {
  return (
    <div class="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800">
      <h1 class="mb-4 text-2xl font-bold">404</h1>
      <p class="mb-4 text-slate-600 dark:text-slate-400">페이지를 찾을 수 없습니다.</p>
      <A href="/home" class="text-primary-500 hover:underline">
        홈으로 돌아가기
      </A>
    </div>
  );
}
