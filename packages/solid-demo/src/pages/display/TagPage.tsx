import { For } from "solid-js";
import { Tag, type TagTheme } from "@simplysm/solid";

const themes: TagTheme[] = ["primary", "info", "success", "warning", "danger", "base"];

export default function LabelPage() {
  return (
    <div class="space-y-8 p-6">
      {/* All Themes */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">테마</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          Tag 컴포넌트는 6가지 테마를 지원합니다. 기본값은 slate입니다.
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <For each={themes}>{(theme) => <Tag theme={theme}>{theme}</Tag>}</For>
        </div>
      </section>

      {/* Default (no theme) */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">기본 태그</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          theme을 지정하지 않으면 slate 테마가 적용됩니다.
        </p>
        <Tag>기본 태그</Tag>
      </section>

      {/* Use Cases */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">활용 예시</h2>
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <span class="font-bold">상태:</span>
            <Tag theme="success">완료</Tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold">상태:</span>
            <Tag theme="warning">대기중</Tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold">상태:</span>
            <Tag theme="danger">오류</Tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold">버전:</span>
            <Tag theme="info">v1.0.0</Tag>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold">카테고리:</span>
            <Tag theme="primary">공지사항</Tag>
            <Tag theme="base">일반</Tag>
          </div>
        </div>
      </section>

      {/* In a List */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">목록에서 사용</h2>
        <div class="divide-y divide-base-200 rounded border border-base-200 dark:divide-base-700 dark:border-base-700">
          <div class="flex items-center justify-between p-3">
            <span>사용자 등록 완료</span>
            <Tag theme="success">완료</Tag>
          </div>
          <div class="flex items-center justify-between p-3">
            <span>결제 처리 중</span>
            <Tag theme="warning">진행중</Tag>
          </div>
          <div class="flex items-center justify-between p-3">
            <span>서버 오류 발생</span>
            <Tag theme="danger">실패</Tag>
          </div>
          <div class="flex items-center justify-between p-3">
            <span>새로운 기능 배포</span>
            <Tag theme="info">신규</Tag>
          </div>
        </div>
      </section>

      {/* Custom Styling */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">커스텀 스타일링</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          class prop으로 추가 스타일을 적용할 수 있습니다.
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <Tag theme="primary" class="text-lg">
            큰 태그
          </Tag>
          <Tag theme="success" class="rounded-full px-3">
            둥근 태그
          </Tag>
          <Tag theme="info" class="font-bold">
            굵은 태그
          </Tag>
        </div>
      </section>
    </div>
  );
}
