import { For } from "solid-js";
import { Alert, type AlertTheme, Icon } from "@simplysm/solid";
import {
  IconInfoCircle,
  IconCircleCheck,
  IconAlertTriangle,
  IconAlertCircle,
} from "@tabler/icons-solidjs";

const themes: AlertTheme[] = ["primary", "info", "success", "warning", "danger", "base"];

export default function NotePage() {
  return (
    <div class="space-y-8 p-6">
      {/* All Themes */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Themes</h2>
        <p class="mb-4 text-sm text-base-600 dark:text-base-400">
          The Alert component supports 6 themes. Default is slate.
        </p>
        <div class="space-y-3">
          <For each={themes}>
            {(theme) => (
              <Alert theme={theme}>
                <strong class="capitalize">{theme}</strong> theme alert.
              </Alert>
            )}
          </For>
        </div>
      </section>

      {/* Default (no theme) */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Default Alert</h2>
        <Alert>If no theme is specified, the slate theme is applied.</Alert>
      </section>

      {/* With Icons */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">With Icons</h2>
        <div class="space-y-3">
          <Alert theme="info">
            <Icon icon={IconInfoCircle} size="1.25em" class="mt-0.5 shrink-0" />
            <div>
              <strong class="block">Info</strong>This feature is only available in the latest version.
            </div>
          </Alert>
          <Alert theme="success">
            <Icon icon={IconCircleCheck} size="1.25em" class="mt-0.5 shrink-0" />
            <div>
              <strong class="block">Success</strong>
              Changes have been saved successfully.
            </div>
          </Alert>
          <Alert theme="warning">
            <Icon icon={IconAlertTriangle} size="1.25em" class="mt-0.5 shrink-0" />
            <div>
              <strong class="block">Warning</strong>This action cannot be undone. Please confirm before proceeding.
            </div>
          </Alert>
          <Alert theme="danger">
            <Icon icon={IconAlertCircle} size="1.25em" class="mt-0.5 shrink-0" />
            <div>
              <strong class="block">Error</strong>
              An error occurred while processing the request. Please try again later.
            </div>
          </Alert>
        </div>
      </section>

      {/* Use Cases */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Use Cases</h2>
        <div class="space-y-4">
          <div>
            <h3 class="mb-2 font-medium">Tips & Hints</h3>
            <Alert theme="primary">
              <strong>Tip:</strong> You can quickly save using the keyboard shortcut Ctrl+S.
            </Alert>
          </div>
          <div>
            <h3 class="mb-2 font-medium">Deprecation Notice</h3>
            <Alert theme="warning">
              <strong>Deprecated:</strong> This API will be removed in v2.0. Please migrate to the new API.
            </Alert>
          </div>
          <div>
            <h3 class="mb-2 font-medium">Error Message</h3>
            <Alert theme="danger">
              <strong>Error Code 500:</strong> An internal server error has occurred.
            </Alert>
          </div>
        </div>
      </section>

      {/* Long Content */}
      <section>
        <h2 class="mb-4 border-l-4 border-primary-500 pl-3 text-lg font-bold">Long Content</h2>
        <Alert theme="info">
          <p class="mb-2">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </p>
          <p>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
            commodo consequat.
          </p>
        </Alert>
      </section>
    </div>
  );
}
