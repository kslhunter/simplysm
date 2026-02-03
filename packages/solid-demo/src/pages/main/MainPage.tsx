import { Topbar, TopbarContainer } from "@simplysm/solid";

export function MainPage() {
  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Main</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-8">
          <h1 class="mb-4 text-2xl font-bold">Welcome to solid-demo</h1>
          <p class="text-gray-600">왼쪽 사이드바 메뉴에서 각 컴포넌트의 데모를 확인할 수 있습니다.</p>
        </div>
      </div>
    </TopbarContainer>
  );
}
