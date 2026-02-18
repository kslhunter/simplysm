import { For } from "solid-js";
import { Alert, type AlertTheme, Topbar, Icon } from "@simplysm/solid";
import {
  IconInfoCircle,
  IconCircleCheck,
  IconAlertTriangle,
  IconAlertCircle,
} from "@tabler/icons-solidjs";

const themes: AlertTheme[] = ["primary", "info", "success", "warning", "danger", "base"];

export default function NotePage() {
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Alert</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* All Themes */}
          <section>
            <h2 class="mb-4 text-xl font-bold">테마</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              Alert 컴포넌트는 6가지 테마를 지원합니다. 기본값은 slate입니다.
            </p>
            <div class="space-y-3">
              <For each={themes}>
                {(theme) => (
                  <Alert theme={theme}>
                    <strong class="capitalize">{theme}</strong> 테마의 노트입니다.
                  </Alert>
                )}
              </For>
            </div>
          </section>

          {/* Default (no theme) */}
          <section>
            <h2 class="mb-4 text-xl font-bold">기본 노트</h2>
            <Alert>theme을 지정하지 않으면 slate 테마가 적용됩니다.</Alert>
          </section>

          {/* With Icons */}
          <section>
            <h2 class="mb-4 text-xl font-bold">아이콘과 함께</h2>
            <div class="space-y-3">
              <Alert theme="info">
                <Icon icon={IconInfoCircle} size="1.25em" class="mt-0.5 shrink-0" />
                <div>
                  <strong class="block">정보</strong>이 기능은 최신 버전에서만 사용할 수 있습니다.
                </div>
              </Alert>
              <Alert theme="success">
                <Icon icon={IconCircleCheck} size="1.25em" class="mt-0.5 shrink-0" />
                <div>
                  <strong class="block">성공</strong>
                  변경사항이 성공적으로 저장되었습니다.
                </div>
              </Alert>
              <Alert theme="warning">
                <Icon icon={IconAlertTriangle} size="1.25em" class="mt-0.5 shrink-0" />
                <div>
                  <strong class="block">주의</strong>이 작업은 되돌릴 수 없습니다. 진행하기 전에
                  확인해 주세요.
                </div>
              </Alert>
              <Alert theme="danger">
                <Icon icon={IconAlertCircle} size="1.25em" class="mt-0.5 shrink-0" />
                <div>
                  <strong class="block">오류</strong>
                  요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
                </div>
              </Alert>
            </div>
          </section>

          {/* Use Cases */}
          <section>
            <h2 class="mb-4 text-xl font-bold">활용 예시</h2>
            <div class="space-y-4">
              <div>
                <h3 class="mb-2 font-medium">팁 & 힌트</h3>
                <Alert theme="primary">
                  <strong>팁:</strong> 키보드 단축키 Ctrl+S를 사용하면 빠르게 저장할 수 있습니다.
                </Alert>
              </div>
              <div>
                <h3 class="mb-2 font-medium">사용 중단 안내</h3>
                <Alert theme="warning">
                  <strong>Deprecated:</strong> 이 API는 v2.0에서 제거될 예정입니다. 새로운 API로
                  마이그레이션하세요.
                </Alert>
              </div>
              <div>
                <h3 class="mb-2 font-medium">에러 메시지</h3>
                <Alert theme="danger">
                  <strong>오류 코드 500:</strong> 서버 내부 오류가 발생했습니다.
                </Alert>
              </div>
            </div>
          </section>

          {/* Long Content */}
          <section>
            <h2 class="mb-4 text-xl font-bold">긴 내용</h2>
            <Alert theme="info">
              <p class="mb-2">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua.
              </p>
              <p>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
                ex ea commodo consequat.
              </p>
            </Alert>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
