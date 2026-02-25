import { A } from "@solidjs/router";

export function NotFoundPage() {
  return (
    <div class="p-6">
      <div class="rounded-lg border border-base-200 bg-base-50 p-8 text-center dark:border-base-700 dark:bg-base-800">
        <h1 class="mb-4 text-2xl font-bold">404</h1>
        <p class="mb-4 text-base-600 dark:text-base-400">Page not found.</p>
        <A href="/home" class="text-primary-500 hover:underline">
          Back to home
        </A>
      </div>
    </div>
  );
}
